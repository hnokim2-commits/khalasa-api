CREATE TABLE IF NOT EXISTS automated_backup_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name text,
  tables_count integer CHECK (tables_count IS NULL OR tables_count >= 0),
  rows_count integer CHECK (rows_count IS NULL OR rows_count >= 0),
  backup_size_bytes bigint CHECK (backup_size_bytes IS NULL OR backup_size_bytes >= 0),
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('sent','failed')),
  recipient text NOT NULL,
  error_code text,
  integrity_verified boolean NOT NULL DEFAULT false,
  integrity_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automated_backup_records_created_idx
  ON automated_backup_records(created_at DESC);

ALTER TABLE automated_backup_records ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE automated_backup_records IS
  'Metadata only for scheduled encrypted backups; backup contents are never stored in the database.';

COMMENT ON COLUMN automated_backup_records.integrity_verified IS
  'True only when the encrypted envelope was decrypted and its table/row counts matched before delivery.';
