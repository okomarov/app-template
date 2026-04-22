-- Bootstrap migration: creates the app schema, users table, and updated_at trigger.

CREATE SCHEMA IF NOT EXISTS app;

CREATE EXTENSION IF NOT EXISTS "pg_jsonschema" SCHEMA extensions;

-- Shared trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users table: references auth.users via guid FK
CREATE TABLE IF NOT EXISTS app.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guid UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  mfa_enrolled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON app.users
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
