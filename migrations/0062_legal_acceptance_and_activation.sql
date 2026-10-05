CREATE TABLE IF NOT EXISTS legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  terms_version text NOT NULL,
  responsibility_accepted boolean NOT NULL DEFAULT false,
  privacy_accepted boolean NOT NULL DEFAULT false,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent_hash text,
  UNIQUE (user_id, role, terms_version)
);

CREATE INDEX IF NOT EXISTS legal_acceptances_user_role_idx
  ON legal_acceptances(user_id, role, accepted_at DESC);

-- Existing approved accounts remain operational. The stricter acceptance flow
-- applies to registrations completed after this release.
INSERT INTO legal_acceptances(user_id, role, terms_version, responsibility_accepted, privacy_accepted)
SELECT ur.user_id, ur.role, 'legacy-pre-v193', true, true
FROM user_roles ur
WHERE ur.role IN ('customer','merchant','rider')
ON CONFLICT DO NOTHING;
