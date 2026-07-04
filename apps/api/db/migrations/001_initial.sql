BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('maestro', 'colaborador', 'solo_lectura');
CREATE TYPE currency_code AS ENUM ('USD', 'ARS');
CREATE TYPE installment_status AS ENUM ('pendiente', 'vencida', 'pagada', 'cancelada');
CREATE TYPE campaign_status AS ENUM ('borrador', 'programada', 'enviando', 'completada', 'cancelada');
CREATE TYPE delivery_status AS ENUM ('pendiente', 'procesando', 'enviado', 'fallido', 'suprimido');

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 255),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  active boolean NOT NULL DEFAULT true,
  token_version integer NOT NULL DEFAULT 0 CHECK (token_version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (company_id, email)
);

CREATE TABLE company_modules (
  company_id uuid NOT NULL REFERENCES companies(id),
  module_key text NOT NULL CHECK (module_key IN ('comercial', 'cobranzas', 'marketing', 'reportes')),
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (company_id, module_key)
);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  owner_user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  country text,
  instagram_handle text,
  facebook_handle text,
  acquisition_channel text NOT NULL CHECK (acquisition_channel IN ('instagram', 'whatsapp', 'facebook', 'otro')),
  payment_alerts_enabled boolean NOT NULL DEFAULT true,
  marketing_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, owner_user_id) REFERENCES users(company_id, id)
);

CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  product_name text NOT NULL,
  total_amount numeric(18,2) NOT NULL CHECK (total_amount > 0),
  currency currency_code NOT NULL,
  sold_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, customer_id) REFERENCES customers(company_id, id)
);

CREATE TABLE installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  sale_id uuid NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  currency currency_code NOT NULL,
  due_date date NOT NULL,
  status installment_status NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (sale_id, sequence),
  FOREIGN KEY (company_id, sale_id) REFERENCES sales(company_id, id)
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  installment_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  currency currency_code NOT NULL,
  method text NOT NULL CHECK (method IN ('efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'criptomoneda')),
  paid_at timestamptz NOT NULL,
  external_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, installment_id) REFERENCES installments(company_id, id)
);

CREATE TABLE customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, customer_id) REFERENCES customers(company_id, id),
  FOREIGN KEY (company_id, author_user_id) REFERENCES users(company_id, id)
);

CREATE TABLE refresh_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, user_id) REFERENCES users(company_id, id)
);

CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, actor_user_id) REFERENCES users(company_id, id)
);

CREATE TABLE suppression_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  email text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('baja', 'rebote', 'queja', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);

CREATE INDEX customers_company_owner_active_idx ON customers(company_id, owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX installments_due_idx ON installments(company_id, due_date, status);
CREATE INDEX payments_installment_idx ON payments(company_id, installment_id);
CREATE INDEX audit_events_company_time_idx ON audit_events(company_id, occurred_at DESC);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_entries ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT nullif(current_setting('app.company_id', true), '')::uuid $$;

CREATE POLICY tenant_users ON users USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());
CREATE POLICY tenant_company_modules ON company_modules USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());
CREATE POLICY tenant_customers ON customers USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());
CREATE POLICY tenant_sales ON sales USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());
CREATE POLICY tenant_installments ON installments USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());
CREATE POLICY tenant_payments ON payments USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());
CREATE POLICY tenant_customer_notes ON customer_notes USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());
CREATE POLICY tenant_refresh_sessions ON refresh_sessions USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());
CREATE POLICY tenant_audit_events ON audit_events USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());
CREATE POLICY tenant_suppression_entries ON suppression_entries USING (company_id = current_tenant_id()) WITH CHECK (company_id = current_tenant_id());

COMMIT;

