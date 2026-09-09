ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE auth_challenges ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS users_customer_email_idx ON users(lower(email)) WHERE email IS NOT NULL AND role='customer';
