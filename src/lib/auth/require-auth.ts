import 'server-only'
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
}

export type AuthErrorCode = 'NO_CLAIMS' | 'NO_APP_USER' | 'INACTIVE' | 'MFA_REQUIRED'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code)
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
        `[requireAuth] Supabase claims valid for sub=${data.claims.sub} (${data.claims.email}) ` +
          `but no row in users. Likely created via Supabase Studio/admin API ` +
          `instead of the signup flow.`,
      )
    }
    throw new AuthError('NO_APP_USER')
  }
  if (!user.active) throw new AuthError('INACTIVE')
  if (!SKIP_MFA && user.mfa_enrolled && data.claims.aal !== 'aal2') {
    throw new AuthError('MFA_REQUIRED')
  }

  return {
    id: user.id,
    guid: user.guid,
    email: user.email,
    name: user.name,
    isAdmin: user.is_admin,
  }
})

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (!user.isAdmin) throw new Error('Forbidden')
  return user
}
