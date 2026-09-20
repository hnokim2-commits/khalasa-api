ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'city_admin';

CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate text NOT NULL,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(governorate, name)
);

INSERT INTO cities(governorate, name, code)
VALUES ('الشرقية', 'كفر صقر', 'sharqia-kafr-saqr')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities(id);
ALTER TABLE riders ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities(id);

UPDATE merchants SET city_id=(SELECT id FROM cities WHERE code='sharqia-kafr-saqr') WHERE city_id IS NULL;
UPDATE riders SET city_id=(SELECT id FROM cities WHERE code='sharqia-kafr-saqr') WHERE city_id IS NULL;
UPDATE orders o SET city_id=m.city_id FROM merchants m WHERE o.merchant_id=m.id AND o.city_id IS NULL;

CREATE TABLE IF NOT EXISTS city_admin_assignments (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id),
  permissions jsonb NOT NULL DEFAULT '{"orders.read":true,"orders.manage":true,"riders.read":true,"riders.manage":true}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id),
  target_user_id uuid REFERENCES users(id),
  city_id uuid REFERENCES cities(id),
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_city_status_idx ON orders(city_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS riders_city_available_idx ON riders(city_id, is_available, verification);
CREATE INDEX IF NOT EXISTS city_admin_city_idx ON city_admin_assignments(city_id, is_active);
