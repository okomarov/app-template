import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { authDb } from '@/db'
import { SKIP_MFA } from '@/lib/constants/auth'
import { createClient } from '@/lib/supabase/server'

export interface AuthUser {
  id: string
  guid: string
  email: string
  name: string
  isAdmin: boolean
  mfaEnrolled: boolean
}

export type AuthErrorCode = 'NO_CLAIMS' | 'NO_APP_USER' | 'INACTIVE'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  // Default message is generic so server actions that propagate this error don't
  // leak the discriminator to the client. Inspect `err.code` server-side.
  constructor(code: AuthErrorCode, message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

export const requireAuth = cache(async function requireAuth(): Promise<AuthUser> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) throw new AuthError('NO_CLAIMS')

  const user = await authDb
    .selectFrom('users')
    .select(['id', 'guid', 'name', 'email', 'is_admin', 'active', 'mfa_enrolled'])
    .where('guid', '=', data.claims.sub)
    .executeTakeFirst()

  if (!user) {
    if (process.env.NODE_ENV !== 'production') {
      // Surfaces the foot-gun where a user is created via Supabase Studio /
      // admin API (only writes auth.users) and never gets a corresponding
      // app-level row from the signup action.
      console.warn(
        `[requireAuth] Supabase claims valid for sub=${data.claims.sub} but no row in users. ` +
          `Likely created via Supabase Studio/admin API instead of the signup flow.`,
      )
    }
    throw new AuthError('NO_APP_USER')
  }
  if (!user.active) throw new AuthError('INACTIVE')

  // Per Supabase guidance: redirect aal1 sessions with enrolled MFA to the
  // challenge instead of returning 401/403. Tabs left open mid-flow are common
  // and a hard error would feel broken.
  if (!SKIP_MFA && user.mfa_enrolled && data.claims.aal !== 'aal2') {
    redirect('/mfa')
  }

  return {
    id: user.id,
    guid: user.guid,
    email: user.email,
    name: user.name,
    isAdmin: user.is_admin,
    mfaEnrolled: user.mfa_enrolled,
  }
})

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (!user.isAdmin) throw new Error('Forbidden')
  return user
}

// Returns the current user or null when no auth claim exists. Lets redirect
// errors from requireAuth (the MFA gate) bubble up so partially-authed users
// always finish the challenge before browsing.
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await requireAuth()
  } catch (err) {
    if (err instanceof AuthError) return null
    throw err
  }
}

// Auth pages: bounce already-authenticated users away from the form.
export async function requireAnonymous(redirectTo = '/'): Promise<void> {
  const user = await getCurrentUser()
  if (user) redirect(redirectTo)
}
