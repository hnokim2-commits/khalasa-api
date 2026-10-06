CREATE TABLE IF NOT EXISTS order_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('order','delivery','product','payment','conduct','other')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 160),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaint_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES order_complaints(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sender_role text NOT NULL CHECK (sender_role IN ('customer','merchant','admin','city_admin')),
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','audio')),
  body text,
  audio_storage_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((message_type='text' AND char_length(body) BETWEEN 1 AND 1000 AND audio_storage_key IS NULL) OR (message_type='audio' AND audio_storage_key IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS order_complaints_order_idx ON order_complaints(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS order_complaints_merchant_status_idx ON order_complaints(merchant_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS order_complaints_city_status_idx ON order_complaints(city_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS complaint_messages_complaint_created_idx ON complaint_messages(complaint_id,created_at);

COMMENT ON TABLE order_complaints IS 'Customer complaints tied to real orders and visible to the responsible merchant and authorized operations staff.';
COMMENT ON TABLE complaint_messages IS 'Private complaint conversation; audio storage support is reserved for the next rollout.';
