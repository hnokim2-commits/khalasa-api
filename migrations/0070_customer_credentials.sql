CREATE TABLE customer_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
