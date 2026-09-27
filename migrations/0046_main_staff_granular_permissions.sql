CREATE TABLE IF NOT EXISTS main_staff_permissions (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS main_staff_permissions_updated_idx
  ON main_staff_permissions(updated_at DESC);

INSERT INTO main_staff_permissions(user_id,permissions)
SELECT u.id,
  CASE u.role
    WHEN 'support' THEN '{"dashboard.read":true,"orders.read":true,"orders.manage":true,"partners.read":true,"documents.read":true}'::jsonb
    WHEN 'accountant' THEN '{"dashboard.read":true,"finance.read":true,"finance.manage":true,"payroll.read":true,"payroll.manage":true,"treasury.read":true,"treasury.manage":true}'::jsonb
    ELSE '{}'::jsonb
  END
FROM users u
WHERE u.role IN ('support','accountant')
ON CONFLICT (user_id) DO NOTHING;
