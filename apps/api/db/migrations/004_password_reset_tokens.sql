BEGIN;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, user_id) REFERENCES users(company_id, id)
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_active_idx
  ON password_reset_tokens(company_id, user_id, expires_at DESC)
  WHERE used_at IS NULL;

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_password_reset_tokens ON password_reset_tokens;
CREATE POLICY tenant_password_reset_tokens ON password_reset_tokens
  USING (company_id = current_tenant_id())
  WITH CHECK (company_id = current_tenant_id());

COMMIT;
