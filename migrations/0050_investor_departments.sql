CREATE TABLE IF NOT EXISTS investor_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES investor_organizations(id) ON DELETE RESTRICT,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  name text NOT NULL,
  manager_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(name) BETWEEN 2 AND 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS investor_departments_name_unique
ON investor_departments(investor_id,city_id,lower(name));

CREATE INDEX IF NOT EXISTS investor_departments_scope_idx
ON investor_departments(investor_id,is_active,city_id);
