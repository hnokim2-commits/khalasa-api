CREATE TABLE IF NOT EXISTS account_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  requested_role text NOT NULL CHECK (requested_role IN ('merchant','rider')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  request_ip_hash text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS account_recovery_one_pending_per_user
ON account_recovery_requests(user_id) WHERE status='pending';

CREATE INDEX IF NOT EXISTS account_recovery_status_created_idx
ON account_recovery_requests(status,created_at DESC);
