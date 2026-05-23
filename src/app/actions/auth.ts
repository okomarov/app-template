'use server'

import { z } from 'zod'
import { db } from '@/db'
import { isAllowedAuthEmail, normalizeAuthEmail } from '@/lib/auth/email'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const SIGNUP_SUCCESS_MESSAGE = 'Check your email to verify your account.'
const DUPLICATE_EMAIL_ERROR = 'This email is already registered. Sign in or reset your password.'

const signupSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.'),
    email: z.string().trim().email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((data) => isAllowedAuthEmail(data.email), {
    message: 'Email domain is not allowed for signup.',
    path: ['email'],
  })

export type SignupResult = { ok: true; message: string } | { ok: false; error: string }

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === '23505'
  )
}

// Supabase signUp is enumeration-safe under PKCE + email confirmations: for an
// existing email it returns a success response with `data.user.identities = []`
// (rather than an error). Fresh signups always include one identity. Combined
// with an app.users existence check by guid, we can both detect duplicates and
// self-heal orphans (auth.users row from an interrupted signup that never got
// its app.users counterpart).
// https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr
function isExistingAuthUser(identities: { id?: string }[] | undefined): boolean {
  return (identities?.length ?? 0) === 0
}

export async function signUpAction(input: z.input<typeof signupSchema>): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).filter(Boolean)
    return { ok: false, error: messages.join(' ') || 'Invalid signup details.' }
  }

  const email = normalizeAuthEmail(parsed.data.email)

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      // No emailRedirectTo: the confirmation template uses {{ .SiteURL }} and
      // hardcodes &next=/mfa/enroll, so it controls the destination.
      data: { name: parsed.data.name },
    },
  })

  if (authError) {
    return { ok: false, error: authError.message || 'Could not create account.' }
  }

  const authUser = authData.user
  if (!authUser) {
    console.error('[signUp] supabase.auth.signUp returned no user for', email)
    return { ok: false, error: 'Could not create account. Please try again.' }
  }

  const existingAuthUser = isExistingAuthUser(authUser.identities)

  if (existingAuthUser) {
    // Either a real duplicate or an orphan from a prior interrupted signup.
    // Check our side: if we already have a users row, it's a duplicate; if
    // not, self-heal by inserting the missing row using the existing guid.
    const appRow = await db
      .selectFrom('users')
      .select('guid')
      .where('guid', '=', authUser.id)
      .executeTakeFirst()
    if (appRow) {
      return { ok: false, error: DUPLICATE_EMAIL_ERROR }
    }
    console.warn('[signUp] healing orphaned auth.users row', { email, guid: authUser.id })
  }

  try {
    await db
      .insertInto('users')
      .values({
        guid: authUser.id,
        name: parsed.data.name,
        email,
      })
      .execute()
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Concurrent signup raced us between the existence check and insert.
      // The auth.users row is shared with the winner; do not delete it.
      return { ok: false, error: DUPLICATE_EMAIL_ERROR }
    }
    console.error('[signUp] app.users insert failed for', email, err)
    // Only roll back auth.users if WE created it on this call. Orphan-heal
    // paths must not delete an auth user that pre-existed.
    if (!existingAuthUser) {
      try {
        await supabaseAdmin().auth.admin.deleteUser(authUser.id)
      } catch (cleanupErr) {
        console.error(
          '[signUp] CRITICAL: failed to delete orphaned auth.users row',
          authUser.id,
          cleanupErr,
        )
      }
    }
    return { ok: false, error: 'Could not create account. Please try again.' }
  }

  return { ok: true, message: SIGNUP_SUCCESS_MESSAGE }
}
