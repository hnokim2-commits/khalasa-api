CREATE TABLE IF NOT EXISTS merchant_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name text NOT NULL,
  display_name text NOT NULL,
  phone text NOT NULL,
  category text NOT NULL,
  city_id uuid NOT NULL REFERENCES cities(id),
  address text NOT NULL,
  access_code_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS merchant_applications_one_pending_phone ON merchant_applications(phone) WHERE status='pending';
