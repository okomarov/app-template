-- Mirror auth.users into app.users atomically via an AFTER INSERT trigger.
--
-- Prior approach: server action called supabase.auth.signUp() and then
-- db.insertInto('users'). Any failure between those steps (function crash,
-- a null user object returned by the SDK, FK or unique violation) left
-- auth.users with an orphan row and no app.users counterpart. The user
-- could never sign in (missing_app_user) and could never re-signup with
-- the same email (Supabase obfuscates duplicates).
--
-- New approach matches Supabase's canonical Next.js pattern
-- (https://supabase.com/docs/guides/auth/managing-user-data): a trigger
-- runs inside the same transaction as the auth.users INSERT, so the two
-- rows are created atomically. The server action's only job becomes
-- "validate input and call signUp".

CREATE OR REPLACE FUNCTION app.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Prefer the name passed in signUp() options.data; fall back to the
  -- email local part so users created via Dashboard/Admin API without
  -- metadata don't rollback the auth.users insert.
  INSERT INTO app.users (guid, name, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (guid) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION app.handle_new_auth_user();

-- Backfill orphans from before the trigger existed.
INSERT INTO app.users (guid, name, email)
SELECT
  au.id,
  COALESCE(NULLIF(au.raw_user_meta_data->>'name', ''), split_part(au.email, '@', 1)),
  au.email
FROM auth.users au
LEFT JOIN app.users u ON u.guid = au.id
WHERE u.guid IS NULL
  AND au.email IS NOT NULL
ON CONFLICT (guid) DO NOTHING;

-- Strengthen the FK: bootstrap created it without ON DELETE, so admin
-- deletion of auth.users would either error (if there's an app.users row)
-- or leave one behind. CASCADE keeps the two in sync.
ALTER TABLE app.users
  DROP CONSTRAINT IF EXISTS users_guid_fkey;

ALTER TABLE app.users
  ADD CONSTRAINT users_guid_fkey
  FOREIGN KEY (guid) REFERENCES auth.users(id) ON DELETE CASCADE;
