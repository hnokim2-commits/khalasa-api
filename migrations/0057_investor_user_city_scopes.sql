CREATE TABLE IF NOT EXISTS investor_user_city_scopes (
  investor_id uuid NOT NULL REFERENCES investor_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (investor_id,user_id,city_id)
);

CREATE INDEX IF NOT EXISTS investor_user_city_scopes_user_idx
ON investor_user_city_scopes(user_id,investor_id);
