CREATE TABLE IF NOT EXISTS investor_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  trade_name text NOT NULL,
  registration_number text,
  tax_number text,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','ended')),
  contract_start date,
  contract_end date,
  platform_commission_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (platform_commission_rate BETWEEN 0 AND 100),
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (contract_end IS NULL OR contract_start IS NULL OR contract_end >= contract_start)
);
CREATE UNIQUE INDEX IF NOT EXISTS investor_organizations_registration_unique ON investor_organizations(registration_number) WHERE registration_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS investor_organizations_status_idx ON investor_organizations(status,created_at DESC);

CREATE TABLE IF NOT EXISTS investor_city_assignments (
  city_id uuid PRIMARY KEY REFERENCES cities(id) ON DELETE RESTRICT,
  investor_id uuid NOT NULL REFERENCES investor_organizations(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS investor_city_assignments_investor_idx ON investor_city_assignments(investor_id,assigned_at DESC);
