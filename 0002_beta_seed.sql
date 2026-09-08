CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('customer','merchant','rider','admin','support','accountant'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('awaiting_merchant','preparing','awaiting_rider','assigned','picked_up','delivered','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('pending','approved','rejected','needs_more_info'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  phone varchar(20) NOT NULL UNIQUE,
  full_name text NOT NULL,
  is_phone_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id),
  display_name text NOT NULL,
  category text NOT NULL,
  address text NOT NULL,
  lat numeric(9,6), lng numeric(9,6),
  minimum_order numeric(12,2) NOT NULL DEFAULT 0,
  is_accepting_orders boolean NOT NULL DEFAULT false,
  verification verification_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  private_storage_key text NOT NULL,
  verification verification_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  vehicle_type text NOT NULL DEFAULT 'motorcycle',
  wallet_or_bank_reference text,
  verification verification_status NOT NULL DEFAULT 'pending',
  probation_ends_at timestamptz,
  is_available boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rider_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  private_storage_key text NOT NULL,
  verification verification_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL, name text NOT NULL,
  polygon_geojson jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  UNIQUE(city, name)
);

CREATE TABLE IF NOT EXISTS merchant_zones (
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES service_zones(id) ON DELETE CASCADE,
  PRIMARY KEY(merchant_id, zone_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_code varchar(24) NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES users(id),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  rider_id uuid REFERENCES riders(id),
  status order_status NOT NULL DEFAULT 'awaiting_merchant',
  delivery_address text NOT NULL,
  delivery_lat numeric(9,6), delivery_lng numeric(9,6),
  payment_method text NOT NULL CHECK (payment_method IN ('cod','wallet','card')),
  merchandise_total numeric(12,2) NOT NULL CHECK (merchandise_total >= 0),
  delivery_fee numeric(12,2) NOT NULL CHECK (delivery_fee >= 0),
  platform_commission numeric(12,2) NOT NULL CHECK (platform_commission >= 0),
  merchant_payout numeric(12,2) NOT NULL CHECK (merchant_payout >= 0),
  delivery_otp_hash text NOT NULL,
  prep_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name text NOT NULL, quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0)
);
CREATE TABLE IF NOT EXISTS order_events (
  id bigserial PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id), status order_status NOT NULL, note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  provider text, provider_reference text, amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  customer_id uuid NOT NULL REFERENCES users(id), merchant_stars smallint CHECK (merchant_stars BETWEEN 1 AND 5),
  rider_stars smallint CHECK (rider_stars BETWEEN 1 AND 5), comment text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_merchant_status_idx ON orders(merchant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_rider_status_idx ON orders(rider_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events(order_id, created_at);
