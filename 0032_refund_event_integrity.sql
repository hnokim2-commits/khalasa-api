CREATE TABLE IF NOT EXISTS financial_request_keys (
  bucket_key text PRIMARY KEY,
  operation text NOT NULL CHECK (operation IN ('rider_withdrawal','merchant_settlement')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_request_keys_created_idx
  ON financial_request_keys(created_at);
