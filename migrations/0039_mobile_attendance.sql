CREATE TABLE IF NOT EXISTS branch_attendance_settings (
  city_id uuid PRIMARY KEY REFERENCES cities(id) ON DELETE CASCADE,
  latitude numeric(9,6) NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  allowed_radius_m integer NOT NULL DEFAULT 150 CHECK(allowed_radius_m BETWEEN 50 AND 500),
  updated_by uuid NOT NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branch_personnel_attendance_credentials (
  personnel_id uuid PRIMARY KEY REFERENCES branch_personnel(id) ON DELETE CASCADE,
  access_code_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  session_version integer NOT NULL DEFAULT 0,
  updated_by uuid NOT NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS check_in_at timestamptz;
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS check_out_at timestamptz;
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS check_in_lat numeric(9,6);
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS check_in_lng numeric(9,6);
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS check_out_lat numeric(9,6);
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS check_out_lng numeric(9,6);
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS location_accuracy_m numeric(8,2);
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS recording_source text NOT NULL DEFAULT 'manager';
ALTER TABLE branch_attendance ADD COLUMN IF NOT EXISTS recorded_personnel_id uuid REFERENCES branch_personnel(id) ON DELETE SET NULL;
ALTER TABLE branch_attendance ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE branch_attendance DROP CONSTRAINT IF EXISTS branch_attendance_recorder_check;
ALTER TABLE branch_attendance ADD CONSTRAINT branch_attendance_recorder_check CHECK(
  (recording_source='manager' AND recorded_by IS NOT NULL) OR
  (recording_source='mobile' AND recorded_personnel_id=personnel_id)
);
ALTER TABLE branch_attendance DROP CONSTRAINT IF EXISTS branch_attendance_recording_source_check;
ALTER TABLE branch_attendance ADD CONSTRAINT branch_attendance_recording_source_check CHECK(recording_source IN ('manager','mobile'));

ALTER TABLE branch_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_personnel_attendance_credentials ENABLE ROW LEVEL SECURITY;
