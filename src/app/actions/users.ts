'use server'

import { z } from 'zod'
import { db } from '@/db'
import { type AuthUser, getCurrentUser, requireAdmin, requireAuth } from '@/lib/auth/require-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Server action wrapper for client callers (TanStack Query needs an action
// endpoint). RSCs should import getCurrentUser from '@/lib/auth/require-auth'
// directly to avoid the extra POST round-trip.
export async function getCurrentUserAction(): Promise<AuthUser | null> {
  return getCurrentUser()
}

export async function getUsers() {
  await requireAuth()
  return db.selectFrom('users').selectAll().orderBy('name', 'asc').execute()
}

// Sets `users.mfa_enrolled = true` after the client has verified a TOTP factor.
// The flag is derived from Supabase's auth.mfa_factors (the source of truth per
// Supabase docs); the action ignores any client input. This prevents a logged-in
// user from POSTing `false` to silently disable their own MFA gate.
export async function markUserMfaEnrolled(): Promise<{ ok: true } | { ok: false; error: string }> {
  const authUser = await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return { ok: false, error: 'Could not verify MFA factors.' }
  const verified = (data?.totp ?? []).some((f) => f.status === 'verified')
  if (!verified) return { ok: false, error: 'No verified MFA factor found.' }
  await db
    .updateTable('users')
    .set({ mfa_enrolled: true })
    .where('guid', '=', authUser.guid)
    .execute()
  return { ok: true }
}

// Server-side password update used by the recovery flow. requireAuth redirects
// MFA-enrolled aal1 sessions to /mfa, so an attacker can't bypass the second
// factor by calling supabase.auth.updateUser directly from a recovery session.
export async function updatePasswordAction(
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  isAdmin: z.boolean().optional().default(false),
})

export async function createUser(data: z.infer<typeof createUserSchema>) {
  await requireAdmin()
  const parsed = createUserSchema.parse(data)

  const { data: authData, error: authError } = await supabaseAdmin().auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
  })

  if (authError) return { error: `Failed to create auth user: ${authError.message}` }
  if (!authData.user) return { error: 'Failed to create auth user: no user returned' }

  try {
    const user = await db
      .insertInto('users')
      .values({
        guid: authData.user.id,
        name: parsed.name,
        email: parsed.email,
        is_admin: parsed.isAdmin,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return { data: user }
  } catch (err) {
    await supabaseAdmin().auth.admin.deleteUser(authData.user.id)
    throw err
  }
}
