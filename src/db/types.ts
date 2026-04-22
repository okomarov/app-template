import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely'

// Regenerate with: npm run db:types
// This file is the Kysely Database interface derived from supabase gen types.
// After running db:types, adapt the generated output into this format.

export interface UsersTable {
  id: Generated<string>
  guid: string
  name: string
  email: string
  active: Generated<boolean>
  is_admin: Generated<boolean>
  mfa_enrolled: Generated<boolean>
  created_at: ColumnType<Date, string | undefined, never>
  updated_at: ColumnType<Date, string | undefined, never>
}

export type User = Selectable<UsersTable>
export type NewUser = Insertable<UsersTable>
export type UserUpdate = Updateable<UsersTable>

export interface Database {
  users: UsersTable
}
