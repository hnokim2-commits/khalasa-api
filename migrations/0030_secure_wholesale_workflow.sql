ALTER TABLE wholesale_requests ADD COLUMN IF NOT EXISTS request_key text, ADD COLUMN IF NOT EXISTS accepted_at timestamptz, ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS wholesale_requests_idempotency_idx ON wholesale_requests(buyer_merchant_id,request_key) WHERE request_key IS NOT NULL;
