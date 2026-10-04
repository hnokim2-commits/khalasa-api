ALTER TABLE users
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS users_archived_at_idx ON users(archived_at) WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN users.archived_at IS 'Soft deletion timestamp. Archived users remain available for audit and financial history.';
COMMENT ON COLUMN users.preferences IS 'Non-sensitive per-user interface preferences such as theme.';
