ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_account_status_check
    CHECK (account_status IN ('active','disabled','archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE users
SET account_status='archived'
WHERE archived_at IS NOT NULL AND account_status<>'archived';

CREATE INDEX IF NOT EXISTS users_account_status_idx ON users(account_status,role);

ALTER TABLE branch_personnel
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS branch_personnel_archived_at_idx
  ON branch_personnel(archived_at) WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN users.account_status IS 'Central lifecycle state used by every Khalasa application.';
COMMENT ON COLUMN branch_personnel.archived_at IS 'Safe archive state for employee attendance identities.';
