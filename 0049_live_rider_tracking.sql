ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'investor';

CREATE TABLE IF NOT EXISTS investor_user_assignments (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES investor_organizations(id) ON DELETE RESTRICT,
  job_title text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(job_title) BETWEEN 2 AND 100)
);
CREATE INDEX IF NOT EXISTS investor_user_assignments_investor_idx ON investor_user_assignments(investor_id,is_active);

CREATE TABLE IF NOT EXISTS investor_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_investor_user_tenant_change() RETURNS trigger AS $$
BEGIN
  IF NEW.investor_id <> OLD.investor_id THEN
    RAISE EXCEPTION 'INVESTOR_USER_TENANT_CHANGE_FORBIDDEN' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS investor_user_tenant_immutable ON investor_user_assignments;
CREATE TRIGGER investor_user_tenant_immutable
BEFORE UPDATE OF investor_id ON investor_user_assignments
FOR EACH ROW EXECUTE FUNCTION prevent_investor_user_tenant_change();
