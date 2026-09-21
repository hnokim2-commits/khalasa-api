CREATE TABLE IF NOT EXISTS request_rate_limits (
  bucket_key text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  reset_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS request_rate_limits_reset_at_idx
  ON request_rate_limits(reset_at);
