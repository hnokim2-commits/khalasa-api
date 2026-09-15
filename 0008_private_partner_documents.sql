ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_otp_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_otp_locked_at timestamptz;

