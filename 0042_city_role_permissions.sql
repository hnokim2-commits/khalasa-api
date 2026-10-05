CREATE TABLE IF NOT EXISTS branch_attendance_payroll_policies (
  city_id uuid PRIMARY KEY REFERENCES cities(id) ON DELETE CASCADE,
  late_deduction_per_minute numeric(10,4) NOT NULL DEFAULT 0 CHECK(late_deduction_per_minute BETWEEN 0 AND 1000),
  early_leave_deduction_per_minute numeric(10,4) NOT NULL DEFAULT 0 CHECK(early_leave_deduction_per_minute BETWEEN 0 AND 1000),
  overtime_bonus_per_minute numeric(10,4) NOT NULL DEFAULT 0 CHECK(overtime_bonus_per_minute BETWEEN 0 AND 1000),
  monthly_deduction_cap numeric(12,2) NOT NULL DEFAULT 0 CHECK(monthly_deduction_cap BETWEEN 0 AND 1000000),
  monthly_overtime_cap numeric(12,2) NOT NULL DEFAULT 0 CHECK(monthly_overtime_cap BETWEEN 0 AND 1000000),
  is_active boolean NOT NULL DEFAULT false,
  updated_by uuid NOT NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE branch_payroll_items ADD COLUMN IF NOT EXISTS attendance_deduction numeric(12,2) NOT NULL DEFAULT 0 CHECK(attendance_deduction>=0);
ALTER TABLE branch_payroll_items ADD COLUMN IF NOT EXISTS overtime_bonus numeric(12,2) NOT NULL DEFAULT 0 CHECK(overtime_bonus>=0);
ALTER TABLE branch_attendance_payroll_policies ENABLE ROW LEVEL SECURITY;
