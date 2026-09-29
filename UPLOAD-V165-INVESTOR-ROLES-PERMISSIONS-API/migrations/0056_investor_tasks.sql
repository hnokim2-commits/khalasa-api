CREATE TABLE IF NOT EXISTS investor_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES investor_organizations(id) ON DELETE CASCADE,
  city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  department_id uuid REFERENCES investor_departments(id) ON DELETE SET NULL,
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title varchar(160) NOT NULL,
  description text,
  priority varchar(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status varchar(24) NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','completed','cancelled')),
  due_date date,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(btrim(title)) BETWEEN 2 AND 160),
  CHECK (department_id IS NOT NULL OR city_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS investor_tasks_scope_idx ON investor_tasks(investor_id,status,due_date);
CREATE INDEX IF NOT EXISTS investor_tasks_department_idx ON investor_tasks(department_id,status);
CREATE INDEX IF NOT EXISTS investor_tasks_assignee_idx ON investor_tasks(assigned_user_id,status);
