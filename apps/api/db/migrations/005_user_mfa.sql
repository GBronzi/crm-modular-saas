BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_secret_encrypted text;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_mfa_secret_enabled_check;
ALTER TABLE users
  ADD CONSTRAINT users_mfa_secret_enabled_check
  CHECK ((mfa_enabled = false) OR (mfa_secret_encrypted IS NOT NULL));

COMMIT;
