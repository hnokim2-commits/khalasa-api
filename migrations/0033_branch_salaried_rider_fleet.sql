CREATE TABLE IF NOT EXISTS branch_rider_employment (
  rider_id uuid PRIMARY KEY REFERENCES riders(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id),
  employment_type text NOT NULL DEFAULT 'per_delivery' CHECK(employment_type IN ('per_delivery','salaried')),
  monthly_salary numeric(12,2) NOT NULL DEFAULT 0 CHECK(monthly_salary>=0),
  daily_minimum integer NOT NULL DEFAULT 0 CHECK(daily_minimum>=0),
  daily_target integer NOT NULL DEFAULT 20 CHECK(daily_target BETWEEN 1 AND 100),
  daily_maximum integer NOT NULL DEFAULT 25 CHECK(daily_maximum BETWEEN 1 AND 100),
  motorcycle_provided boolean NOT NULL DEFAULT false,
  equipment_notes text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(daily_minimum<=daily_target AND daily_target<=daily_maximum),
  CHECK(employment_type<>'salaried' OR monthly_salary>0)
);

CREATE TABLE IF NOT EXISTS branch_rider_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id),
  asset_type text NOT NULL CHECK(asset_type IN ('motorcycle','helmet','phone','uniform','cash_bag','other')),
  asset_name text NOT NULL CHECK(length(asset_name) BETWEEN 2 AND 120),
  serial_number text,
  notes text,
  status text NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','returned','maintenance','lost')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  created_by uuid REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS branch_fleet_delivery_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  rider_id uuid NOT NULL REFERENCES riders(id),
  city_id uuid NOT NULL REFERENCES cities(id),
  entry_type text NOT NULL CHECK(entry_type IN ('delivery_earning','delivery_refund_reversal')),
  amount numeric(12,2) NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,entry_type)
);

CREATE INDEX IF NOT EXISTS branch_rider_employment_city_idx ON branch_rider_employment(city_id,is_active);
CREATE INDEX IF NOT EXISTS branch_rider_assets_rider_idx ON branch_rider_assets(rider_id,status);
CREATE INDEX IF NOT EXISTS branch_fleet_revenue_city_idx ON branch_fleet_delivery_revenue(city_id,created_at DESC);

CREATE OR REPLACE FUNCTION route_salaried_rider_delivery_earning() RETURNS trigger AS $$
DECLARE employment branch_rider_employment%ROWTYPE;
DECLARE target_city uuid;
BEGIN
  IF NEW.entry_type='delivery_earning' THEN
    SELECT * INTO employment FROM branch_rider_employment
    WHERE rider_id=NEW.rider_id AND employment_type='salaried' AND is_active=true;
    IF FOUND THEN
      INSERT INTO branch_fleet_delivery_revenue(order_id,rider_id,city_id,entry_type,amount,description,created_at)
      VALUES(NEW.order_id,NEW.rider_id,employment.city_id,'delivery_earning',NEW.amount,NEW.description,COALESCE(NEW.created_at,now()))
      ON CONFLICT(order_id,entry_type) DO NOTHING;
      RETURN NULL;
    END IF;
  ELSIF NEW.entry_type='delivery_refund_reversal' AND EXISTS(
    SELECT 1 FROM branch_fleet_delivery_revenue WHERE order_id=NEW.order_id AND entry_type='delivery_earning'
  ) THEN
    SELECT city_id INTO target_city FROM riders WHERE id=NEW.rider_id;
    INSERT INTO branch_fleet_delivery_revenue(order_id,rider_id,city_id,entry_type,amount,description,created_at)
    VALUES(NEW.order_id,NEW.rider_id,target_city,'delivery_refund_reversal',NEW.amount,NEW.description,COALESCE(NEW.created_at,now()))
    ON CONFLICT(order_id,entry_type) DO NOTHING;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rider_wallet_salaried_fleet_trigger ON rider_wallet_entries;
CREATE TRIGGER rider_wallet_salaried_fleet_trigger
BEFORE INSERT ON rider_wallet_entries
FOR EACH ROW EXECUTE FUNCTION route_salaried_rider_delivery_earning();

ALTER TABLE branch_rider_employment ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_rider_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_fleet_delivery_revenue ENABLE ROW LEVEL SECURITY;
