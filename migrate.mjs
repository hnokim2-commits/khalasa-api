CREATE TABLE IF NOT EXISTS system_events (
  id bigserial PRIMARY KEY,
  severity text NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  category text NOT NULL,
  code text NOT NULL,
  route text,
  method text,
  http_status integer CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_events_created_idx ON system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS system_events_severity_idx ON system_events(severity, created_at DESC);

CREATE TABLE IF NOT EXISTS manual_backup_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name text NOT NULL,
  tables_count integer CHECK (tables_count IS NULL OR tables_count >= 0),
  rows_count integer CHECK (rows_count IS NULL OR rows_count >= 0),
  backup_size_bytes bigint CHECK (backup_size_bytes IS NULL OR backup_size_bytes >= 0),
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  confirmed_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manual_backup_records_created_idx ON manual_backup_records(created_at DESC);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_backup_records ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE system_events IS 'PII-free operational events for launch monitoring';
COMMENT ON TABLE manual_backup_records IS 'Administrative confirmations of encrypted manual backups';
