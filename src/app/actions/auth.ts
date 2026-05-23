'use server'

import { z } from 'zod'
import { isAllowedAuthEmail, normalizeAuthEmail } from '@/lib/auth/email'
import { createClient } from '@/lib/supabase/server'

const SIGNUP_SUCCESS_MESSAGE = 'Check your email to verify your account.'

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

// Mirroring auth.users into app.users is handled by the on_auth_user_created
// trigger (see migration 20260523004320_mirror_auth_users_via_trigger.sql), so
// the action only validates input and calls signUp. Supabase obfuscates
// duplicates by returning the same success shape with identities=[]; we
// intentionally don't branch on that to preserve enumeration safety, which
// matches the canonical Next.js pattern in Supabase's docs.
export async function signUpAction(input: z.input<typeof signupSchema>): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).filter(Boolean)
    return { ok: false, error: messages.join(' ') || 'Invalid signup details.' }
  }

  const email = normalizeAuthEmail(parsed.data.email)

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      // No emailRedirectTo: the confirmation template uses {{ .SiteURL }} and
      // hardcodes &next=/mfa/enroll, so it controls the destination.
      data: { name: parsed.data.name },
    },
  })

  if (error) {
    return { ok: false, error: error.message || 'Could not create account.' }
  }

  return { ok: true, message: SIGNUP_SUCCESS_MESSAGE }
}
