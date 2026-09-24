-- The API records the refund event after updating the order. The legacy database
-- trigger also recorded it, which produced duplicate and conflicting history rows.
CREATE OR REPLACE FUNCTION record_refunded_order_event() RETURNS trigger AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalize_refund_order_event() RETURNS trigger AS $$
BEGIN
  IF NEW.note LIKE 'استرداد كامل:%'
     AND EXISTS (
       SELECT 1 FROM orders
       WHERE id=NEW.order_id AND refunded_at IS NOT NULL
     ) THEN
    NEW.status='cancelled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_events_refund_status_trigger ON order_events;
CREATE TRIGGER order_events_refund_status_trigger
BEFORE INSERT ON order_events
FOR EACH ROW EXECUTE FUNCTION normalize_refund_order_event();
