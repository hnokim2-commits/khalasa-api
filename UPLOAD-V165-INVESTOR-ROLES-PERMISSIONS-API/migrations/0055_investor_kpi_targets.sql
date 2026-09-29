CREATE TABLE IF NOT EXISTS investor_kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES investor_organizations(id) ON DELETE CASCADE,
  city_id uuid REFERENCES cities(id) ON DELETE CASCADE,
  department_id uuid REFERENCES investor_departments(id) ON DELETE CASCADE,
  target_month date NOT NULL,
  delivered_orders_target integer,
  revenue_target numeric(14,2),
  active_staff_target integer,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (EXTRACT(DAY FROM target_month)=1),
  CHECK ((city_id IS NOT NULL)::int+(department_id IS NOT NULL)::int=1),
  CHECK (delivered_orders_target IS NULL OR delivered_orders_target>=0),
  CHECK (revenue_target IS NULL OR revenue_target>=0),
  CHECK (active_staff_target IS NULL OR active_staff_target>=0),
  CHECK ((city_id IS NOT NULL AND delivered_orders_target IS NOT NULL AND revenue_target IS NOT NULL AND active_staff_target IS NULL) OR (department_id IS NOT NULL AND active_staff_target IS NOT NULL AND delivered_orders_target IS NULL AND revenue_target IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS investor_kpi_city_month_unique ON investor_kpi_targets(investor_id,city_id,target_month) WHERE city_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS investor_kpi_department_month_unique ON investor_kpi_targets(investor_id,department_id,target_month) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS investor_kpi_scope_month_idx ON investor_kpi_targets(investor_id,target_month DESC);
