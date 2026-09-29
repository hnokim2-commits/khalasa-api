CREATE TABLE IF NOT EXISTS investor_department_users (
  department_id uuid NOT NULL REFERENCES investor_departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (department_id,user_id)
);
CREATE INDEX IF NOT EXISTS investor_department_users_user_idx ON investor_department_users(user_id,is_active);
