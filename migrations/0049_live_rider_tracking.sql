CREATE TABLE IF NOT EXISTS rider_live_locations (
  rider_id uuid PRIMARY KEY REFERENCES riders(id) ON DELETE CASCADE,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  accuracy_m double precision NOT NULL CHECK (accuracy_m BETWEEN 0 AND 150),
  heading_degrees double precision CHECK (heading_degrees >= 0 AND heading_degrees <= 360),
  speed_mps double precision CHECK (speed_mps >= 0 AND speed_mps <= 60),
  captured_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rider_live_locations_updated_idx ON rider_live_locations(updated_at DESC);
COMMENT ON TABLE rider_live_locations IS 'Latest active-delivery position only; no historical movement trail is retained.';
