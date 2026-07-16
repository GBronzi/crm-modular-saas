BEGIN;

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  owner_user_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 255),
  subject text NOT NULL CHECK (length(trim(subject)) BETWEEN 2 AND 255),
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 20000),
  status campaign_status NOT NULL DEFAULT 'borrador',
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, owner_user_id) REFERENCES users(company_id, id)
);

CREATE TABLE IF NOT EXISTS campaign_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  email text NOT NULL,
  status delivery_status NOT NULL DEFAULT 'pendiente',
  idempotency_key text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (company_id, campaign_id, customer_id),
  UNIQUE (company_id, idempotency_key),
  FOREIGN KEY (company_id, campaign_id) REFERENCES campaigns(company_id, id),
  FOREIGN KEY (company_id, customer_id) REFERENCES customers(company_id, id)
);

CREATE INDEX IF NOT EXISTS campaigns_company_status_idx ON campaigns(company_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS campaign_deliveries_due_idx ON campaign_deliveries(company_id, status, next_attempt_at, created_at);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE campaign_deliveries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_campaigns ON campaigns;
CREATE POLICY tenant_campaigns ON campaigns USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_campaign_deliveries ON campaign_deliveries;
CREATE POLICY tenant_campaign_deliveries ON campaign_deliveries USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());

COMMIT;
