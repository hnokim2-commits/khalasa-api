ALTER TABLE rider_wallet_entries DROP CONSTRAINT IF EXISTS rider_wallet_entries_order_id_key;
ALTER TABLE rider_wallet_entries DROP CONSTRAINT IF EXISTS rider_wallet_entries_entry_type_check;
ALTER TABLE rider_wallet_entries ADD CONSTRAINT rider_wallet_entries_entry_type_check CHECK(entry_type IN ('delivery_earning','withdrawal','cash_collection','cash_remittance'));
CREATE UNIQUE INDEX IF NOT EXISTS rider_wallet_entries_order_type_unique ON rider_wallet_entries(order_id,entry_type) WHERE order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS rider_cash_remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK(amount > 0), received_by uuid NOT NULL REFERENCES users(id),
  note text, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rider_wallet_entries ADD COLUMN IF NOT EXISTS cash_remittance_id uuid UNIQUE REFERENCES rider_cash_remittances(id);

INSERT INTO rider_wallet_entries(rider_id,order_id,entry_type,amount,description,created_at)
SELECT o.rider_id,o.id,'cash_collection',-(o.merchandise_total+o.delivery_fee),'تحصيل نقدي من العميل للطلب '||o.public_code,o.updated_at
FROM orders o WHERE o.status='delivered' AND o.payment_method='cod' AND o.rider_id IS NOT NULL
ON CONFLICT(order_id,entry_type) WHERE order_id IS NOT NULL DO NOTHING;
