CREATE TABLE IF NOT EXISTS order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('customer','rider')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_messages_order_created_idx
  ON order_messages(order_id, created_at);

COMMENT ON TABLE order_messages IS 'Private in-app messages scoped to an order; phone numbers are never exposed through this channel.';
