CREATE TABLE IF NOT EXISTS delivery_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES riders(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('bicycle','motorcycle','car')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS delivery_trips_one_active_per_rider_idx ON delivery_trips(rider_id) WHERE status='active';

CREATE TABLE IF NOT EXISTS delivery_trip_orders (
  trip_id uuid NOT NULL REFERENCES delivery_trips(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  pickup_sequence smallint NOT NULL CHECK (pickup_sequence BETWEEN 1 AND 2),
  delivery_sequence smallint NOT NULL CHECK (delivery_sequence BETWEEN 1 AND 2),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(trip_id,order_id),
  UNIQUE(trip_id,pickup_sequence),
  UNIQUE(trip_id,delivery_sequence)
);

CREATE TABLE IF NOT EXISTS operation_receipts (
  actor_user_id uuid NOT NULL REFERENCES users(id),
  operation_key varchar(100) NOT NULL,
  operation_type varchar(80) NOT NULL,
  resource_id uuid,
  response_body jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_user_id,operation_key)
);

CREATE INDEX IF NOT EXISTS operation_receipts_created_idx ON operation_receipts(created_at);
CREATE INDEX IF NOT EXISTS delivery_trip_orders_trip_idx ON delivery_trip_orders(trip_id,pickup_sequence,delivery_sequence);

-- Attach currently active assignments to auditable trips during the upgrade.
WITH active_riders AS (
  SELECT DISTINCT r.id rider_id,r.vehicle_type
  FROM riders r JOIN orders o ON o.rider_id=r.id AND o.status IN ('assigned','picked_up')
), inserted AS (
  INSERT INTO delivery_trips(rider_id,vehicle_type)
  SELECT rider_id,vehicle_type FROM active_riders
  ON CONFLICT DO NOTHING
  RETURNING id,rider_id
), active_trips AS (
  SELECT id,rider_id FROM delivery_trips WHERE status='active'
), ranked AS (
  SELECT t.id trip_id,o.id order_id,row_number() OVER(PARTITION BY t.id ORDER BY CASE WHEN o.status='picked_up' THEN 0 ELSE 1 END,o.created_at)::smallint sequence
  FROM active_trips t JOIN orders o ON o.rider_id=t.rider_id AND o.status IN ('assigned','picked_up')
)
INSERT INTO delivery_trip_orders(trip_id,order_id,pickup_sequence,delivery_sequence)
SELECT trip_id,order_id,sequence,sequence FROM ranked WHERE sequence<=2
ON CONFLICT(order_id) DO NOTHING;
