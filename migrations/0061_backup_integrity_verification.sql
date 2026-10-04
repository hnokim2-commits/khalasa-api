ALTER TABLE automated_backup_records
  ADD COLUMN IF NOT EXISTS integrity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS integrity_verified_at timestamptz;

COMMENT ON COLUMN automated_backup_records.integrity_verified IS 'True only when the encrypted envelope was decrypted and its table/row counts matched before delivery.';
