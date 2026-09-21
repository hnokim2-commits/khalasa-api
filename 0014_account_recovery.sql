CREATE TABLE IF NOT EXISTS rider_wallet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  order_id uuid UNIQUE REFERENCES orders(id),
  withdrawal_request_id uuid UNIQUE,
  entry_type text NOT NULL CHECK (entry_type IN ('delivery_earning','withdrawal')),
  amount numeric(12,2) NOT NULL CHECK (amount <> 0),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rider_withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payout_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rider_wallet_entries
  ADD CONSTRAINT rider_wallet_entries_withdrawal_request_fk
  FOREIGN KEY (withdrawal_request_id) REFERENCES rider_withdrawal_requests(id);

CREATE INDEX IF NOT EXISTS rider_wallet_entries_rider_created_idx ON rider_wallet_entries(rider_id,created_at DESC);
CREATE INDEX IF NOT EXISTS rider_withdrawals_rider_created_idx ON rider_withdrawal_requests(rider_id,created_at DESC);

INSERT INTO rider_wallet_entries(rider_id,order_id,entry_type,amount,description,created_at)
SELECT o.rider_id,o.id,'delivery_earning',o.delivery_fee,'أجرة توصيل الطلب '||o.public_code,o.updated_at
FROM orders o
WHERE o.status='delivered' AND o.rider_id IS NOT NULL
ON CONFLICT(order_id) DO NOTHING;
