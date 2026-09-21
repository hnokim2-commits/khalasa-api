CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

INSERT INTO user_roles(user_id, role)
SELECT id, role FROM users
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION sync_primary_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_roles(user_id, role)
  VALUES (NEW.id, NEW.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_sync_primary_role ON users;
CREATE TRIGGER users_sync_primary_role
AFTER INSERT OR UPDATE OF role ON users
FOR EACH ROW EXECUTE FUNCTION sync_primary_user_role();

CREATE TABLE IF NOT EXISTS partner_credentials (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL CHECK (role IN ('merchant','rider')),
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

INSERT INTO partner_credentials(user_id, role, password_hash, is_active, updated_at)
SELECT sc.user_id, u.role, sc.password_hash, sc.is_active, sc.updated_at
FROM staff_credentials sc
JOIN users u ON u.id=sc.user_id
WHERE u.role IN ('merchant','rider')
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_credentials ENABLE ROW LEVEL SECURITY;
DO $security$
DECLARE client_role text;
BEGIN
  FOR client_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')
  LOOP
    EXECUTE format('REVOKE ALL ON user_roles FROM %I',client_role);
    EXECUTE format('REVOKE ALL ON partner_credentials FROM %I',client_role);
  END LOOP;
END
$security$;
