ALTER TABLE service_zones
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities(id),
  ADD COLUMN IF NOT EXISTS center_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS center_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS radius_km numeric(8,2),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE service_zones ALTER COLUMN polygon_geojson SET DEFAULT '{"type":"Polygon","coordinates":[]}'::jsonb;

CREATE INDEX IF NOT EXISTS service_zones_city_active_idx ON service_zones(city_id,is_active,name);

CREATE TABLE IF NOT EXISTS support_tickets (
  id bigserial PRIMARY KEY,
  requester_type text NOT NULL CHECK(requester_type IN ('customer','merchant','rider','internal')),
  requester_user_id uuid REFERENCES users(id),
  summary text NOT NULL CHECK(length(summary) BETWEEN 5 AND 500),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  assigned_to uuid REFERENCES users(id),
  resolution_note text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS support_tickets_status_created_idx ON support_tickets(status,created_at DESC);
