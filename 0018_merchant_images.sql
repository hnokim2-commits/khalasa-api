ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_issue_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_issue_note text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_issue_reported_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_retry_at timestamptz;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_delivery_issue_code_check CHECK (
    delivery_issue_code IS NULL OR delivery_issue_code IN ('customer_unavailable','address_problem','customer_requested_reschedule','safety_issue','other')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS orders_open_delivery_issue_idx
  ON orders(delivery_issue_reported_at DESC)
  WHERE delivery_issue_code IS NOT NULL AND status='picked_up';
