'use server'

import { z } from 'zod'
import { db } from '@/db'
import { type AuthUser, requireAdmin, requireAuth } from '@/lib/auth/require-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await requireAuth()
  } catch {
    return null
  }
}

export async function getUsers() {
  await requireAuth()
  return db.selectFrom('users').selectAll().orderBy('name', 'asc').execute()
}

export async function updateUserMfaEnrolledStatus(mfaEnrolled: boolean) {
  const authUser = await requireAuth()
  await db
    .updateTable('users')
    .set({ mfa_enrolled: mfaEnrolled })
    .where('guid', '=', authUser.guid)
    .execute()
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
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
