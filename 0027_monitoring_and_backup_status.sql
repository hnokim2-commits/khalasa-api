ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_by uuid REFERENCES users(id);

CREATE TABLE IF NOT EXISTS order_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  amount numeric(12,2) NOT NULL CHECK(amount > 0),
  reason text NOT NULL CHECK(length(reason) >= 3),
  refund_channel text NOT NULL DEFAULT 'cash_by_admin' CHECK(refund_channel IN ('cash_by_admin','original_payment_method')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE merchant_wallet_entries DROP CONSTRAINT IF EXISTS merchant_wallet_entries_entry_type_check;
ALTER TABLE merchant_wallet_entries ADD CONSTRAINT merchant_wallet_entries_entry_type_check
CHECK(entry_type IN ('order_earning','settlement','refund_reversal'));
ALTER TABLE merchant_wallet_entries DROP CONSTRAINT IF EXISTS merchant_wallet_entries_order_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS merchant_wallet_entries_order_type_unique
ON merchant_wallet_entries(order_id,entry_type) WHERE order_id IS NOT NULL;

ALTER TABLE rider_wallet_entries DROP CONSTRAINT IF EXISTS rider_wallet_entries_entry_type_check;
ALTER TABLE rider_wallet_entries ADD CONSTRAINT rider_wallet_entries_entry_type_check
CHECK(entry_type IN ('delivery_earning','withdrawal','cash_collection','cash_remittance','delivery_refund_reversal','cash_refund_reversal'));

CREATE INDEX IF NOT EXISTS order_refunds_created_idx ON order_refunds(created_at DESC);
ALTER TABLE order_refunds ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION mark_refunded_order_cancelled() RETURNS trigger AS $$
BEGIN
  IF NEW.refunded_at IS NOT NULL AND OLD.refunded_at IS NULL THEN
    NEW.status='cancelled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_refund_status_trigger ON orders;
CREATE TRIGGER orders_refund_status_trigger
BEFORE UPDATE OF refunded_at ON orders
FOR EACH ROW EXECUTE FUNCTION mark_refunded_order_cancelled();

CREATE OR REPLACE FUNCTION record_refunded_order_event() RETURNS trigger AS $$
BEGIN
  IF NEW.refunded_at IS NOT NULL AND OLD.refunded_at IS NULL THEN
    INSERT INTO order_events(order_id,actor_user_id,status,note)
    VALUES(NEW.id,NEW.refunded_by,'cancelled','استرداد كامل: '||COALESCE(NEW.refund_reason,'سبب غير مسجل'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_refund_event_trigger ON orders;
CREATE TRIGGER orders_refund_event_trigger
AFTER UPDATE OF refunded_at ON orders
FOR EACH ROW EXECUTE FUNCTION record_refunded_order_event();
