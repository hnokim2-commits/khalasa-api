CREATE TABLE IF NOT EXISTS branch_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES branch_personnel(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id),
  work_date date NOT NULL,
  status text NOT NULL CHECK(status IN ('present','absent','leave','holiday')),
  check_in time,
  check_out time,
  notes text,
  recorded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(check_out IS NULL OR check_in IS NULL OR check_out>check_in),
  UNIQUE(personnel_id,work_date)
);

CREATE TABLE IF NOT EXISTS branch_payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES branch_personnel(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id),
  payroll_month date NOT NULL CHECK(payroll_month=date_trunc('month',payroll_month)::date),
  adjustment_type text NOT NULL CHECK(adjustment_type IN ('bonus','deduction','advance')),
  amount numeric(12,2) NOT NULL CHECK(amount>0 AND amount<=1000000),
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 300),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branch_payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id),
  payroll_month date NOT NULL CHECK(payroll_month=date_trunc('month',payroll_month)::date),
  status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected','paid')),
  gross_total numeric(14,2) NOT NULL DEFAULT 0,
  deduction_total numeric(14,2) NOT NULL DEFAULT 0,
  net_total numeric(14,2) NOT NULL DEFAULT 0,
  submitted_by uuid NOT NULL REFERENCES users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text,
  paid_at timestamptz,
  UNIQUE(city_id,payroll_month)
);

CREATE TABLE IF NOT EXISTS branch_payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES branch_payroll_runs(id) ON DELETE CASCADE,
  personnel_id uuid NOT NULL REFERENCES branch_personnel(id),
  base_salary numeric(12,2) NOT NULL,
  present_days integer NOT NULL DEFAULT 0,
  absent_days integer NOT NULL DEFAULT 0,
  leave_days integer NOT NULL DEFAULT 0,
  completed_deliveries integer NOT NULL DEFAULT 0,
  target_deliveries integer NOT NULL DEFAULT 0,
  bonuses numeric(12,2) NOT NULL DEFAULT 0,
  deductions numeric(12,2) NOT NULL DEFAULT 0,
  advances numeric(12,2) NOT NULL DEFAULT 0,
  absence_deduction numeric(12,2) NOT NULL DEFAULT 0,
  net_salary numeric(12,2) NOT NULL CHECK(net_salary>=0),
  calculation jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(payroll_run_id,personnel_id)
);

CREATE INDEX IF NOT EXISTS branch_attendance_city_date_idx ON branch_attendance(city_id,work_date);
CREATE INDEX IF NOT EXISTS branch_payroll_adjustments_city_month_idx ON branch_payroll_adjustments(city_id,payroll_month);
CREATE INDEX IF NOT EXISTS branch_payroll_runs_status_idx ON branch_payroll_runs(status,payroll_month);
ALTER TABLE branch_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_payroll_items ENABLE ROW LEVEL SECURITY;
