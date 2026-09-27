CREATE TABLE IF NOT EXISTS branch_work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name text NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 80),
  start_time time NOT NULL,
  end_time time NOT NULL,
  grace_minutes integer NOT NULL DEFAULT 10 CHECK(grace_minutes BETWEEN 0 AND 120),
  working_days jsonb NOT NULL DEFAULT '[0,1,2,3,4,5]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city_id,name)
);

CREATE TABLE IF NOT EXISTS branch_personnel_shift_assignments (
  personnel_id uuid PRIMARY KEY REFERENCES branch_personnel(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES branch_work_shifts(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES users(id),
  assigned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES branch_work_shifts(id) ON DELETE SET NULL;
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS late_minutes integer NOT NULL DEFAULT 0 CHECK(late_minutes>=0);
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS early_leave_minutes integer NOT NULL DEFAULT 0 CHECK(early_leave_minutes>=0);
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS overtime_minutes integer NOT NULL DEFAULT 0 CHECK(overtime_minutes>=0);
DO $$ DECLARE constraint_name text; BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='branch_attendance'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) ILIKE '%check_out%check_in%'
  LOOP
    EXECUTE format('ALTER TABLE branch_attendance DROP CONSTRAINT %I',constraint_name);
  END LOOP;
END $$;
ALTER TABLE branch_payroll_items ADD COLUMN IF NOT EXISTS late_minutes integer NOT NULL DEFAULT 0 CHECK(late_minutes>=0);
ALTER TABLE branch_payroll_items ADD COLUMN IF NOT EXISTS early_leave_minutes integer NOT NULL DEFAULT 0 CHECK(early_leave_minutes>=0);
ALTER TABLE branch_payroll_items ADD COLUMN IF NOT EXISTS overtime_minutes integer NOT NULL DEFAULT 0 CHECK(overtime_minutes>=0);

CREATE TABLE IF NOT EXISTS branch_attendance_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES branch_personnel(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  requested_check_in time,
  requested_check_out time,
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 5 AND 500),
  status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),
  review_note text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(requested_check_in IS NOT NULL OR requested_check_out IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS branch_attendance_correction_pending_uidx ON branch_attendance_corrections(personnel_id,work_date) WHERE status='submitted';
CREATE INDEX IF NOT EXISTS branch_attendance_corrections_city_status_idx ON branch_attendance_corrections(city_id,status,created_at);
ALTER TABLE branch_work_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_personnel_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_attendance_corrections ENABLE ROW LEVEL SECURITY;
