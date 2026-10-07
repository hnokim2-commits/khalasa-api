CREATE TABLE IF NOT EXISTS backup_restore_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name text NOT NULL,
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  tables_count integer CHECK (tables_count IS NULL OR tables_count >= 0),
  rows_count integer CHECK (rows_count IS NULL OR rows_count >= 0),
  migrations_count integer CHECK (migrations_count IS NULL OR migrations_count >= 0),
  status text NOT NULL DEFAULT 'passed' CHECK (status IN ('passed','failed')),
  production_untouched boolean NOT NULL DEFAULT true,
  confirmed_by uuid REFERENCES users(id),
  tested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS backup_restore_drills_tested_idx
  ON backup_restore_drills(tested_at DESC);

ALTER TABLE backup_restore_drills ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE backup_restore_drills IS
  'Metadata for controlled backup restore drills; decrypted contents and passphrases are never stored.';
