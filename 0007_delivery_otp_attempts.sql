CREATE TABLE IF NOT EXISTS rider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  city_id uuid NOT NULL REFERENCES cities(id),
  vehicle_type text NOT NULL DEFAULT 'motorcycle',
  source text NOT NULL CHECK (source IN ('self','merchant')),
  nominated_by_merchant_id uuid REFERENCES merchants(id),
  access_code_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rider_applications_one_pending_phone
ON rider_applications(phone) WHERE status='pending';
