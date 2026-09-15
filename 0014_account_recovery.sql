ALTER TABLE merchants ADD COLUMN IF NOT EXISTS payout_reference text;

CREATE TABLE IF NOT EXISTS merchant_wallet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  order_id uuid UNIQUE REFERENCES orders(id), settlement_request_id uuid UNIQUE,
  entry_type text NOT NULL CHECK (entry_type IN ('order_earning','settlement')),
  amount numeric(12,2) NOT NULL CHECK (amount <> 0), description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS merchant_settlement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0), payout_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE merchant_wallet_entries ADD CONSTRAINT merchant_wallet_entries_settlement_fk FOREIGN KEY(settlement_request_id) REFERENCES merchant_settlement_requests(id);
CREATE INDEX IF NOT EXISTS merchant_wallet_entries_merchant_created_idx ON merchant_wallet_entries(merchant_id,created_at DESC);
CREATE INDEX IF NOT EXISTS merchant_settlements_merchant_created_idx ON merchant_settlement_requests(merchant_id,created_at DESC);

INSERT INTO merchant_wallet_entries(merchant_id,order_id,entry_type,amount,description,created_at)
SELECT o.merchant_id,o.id,'order_earning',o.merchant_payout,'مستحق الطلب '||o.public_code,o.updated_at FROM orders o
WHERE o.status='delivered' ON CONFLICT(order_id) DO NOTHING;
