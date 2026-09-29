CREATE TABLE IF NOT EXISTS investor_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES investor_organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES investor_departments(id) ON DELETE SET NULL,
  city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  source_key text NOT NULL,
  notification_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','processed')),
  target_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  processed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(investor_id,source_key),
  CHECK (char_length(source_key) BETWEEN 3 AND 180),
  CHECK (char_length(title) BETWEEN 2 AND 160),
  CHECK (char_length(message) BETWEEN 2 AND 600)
);

CREATE INDEX IF NOT EXISTS investor_notifications_scope_idx
  ON investor_notifications(investor_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS investor_notifications_department_idx
  ON investor_notifications(department_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS investor_notifications_city_idx
  ON investor_notifications(city_id,status,created_at DESC);

