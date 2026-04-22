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

export const requireAuth = cache(async function requireAuth(): Promise<AuthUser> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) throw new Error('Unauthorized')

  const user = await authDb
    .selectFrom('users')
    .select(['id', 'guid', 'name', 'email', 'is_admin', 'active', 'mfa_enrolled'])
    .where('guid', '=', data.claims.sub)
    .executeTakeFirst()

  if (!user?.active) throw new Error('Unauthorized')

  if (!SKIP_MFA && user.mfa_enrolled && data.claims.aal !== 'aal2') {
    throw new Error('MFA required')
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
