ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS security_consent_at timestamptz;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS legal_consent_at timestamptz;
ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS consent_version text;

ALTER TABLE rider_applications ADD COLUMN IF NOT EXISTS security_consent_at timestamptz;
ALTER TABLE rider_applications ADD COLUMN IF NOT EXISTS legal_consent_at timestamptz;
ALTER TABLE rider_applications ADD COLUMN IF NOT EXISTS consent_version text;

COMMENT ON COLUMN merchant_applications.security_consent_at IS 'Explicit security acknowledgement captured during registration';
COMMENT ON COLUMN merchant_applications.legal_consent_at IS 'Explicit legal-use acknowledgement captured during registration';
COMMENT ON COLUMN rider_applications.security_consent_at IS 'Explicit security acknowledgement captured during registration';
COMMENT ON COLUMN rider_applications.legal_consent_at IS 'Explicit legal-use acknowledgement captured during registration';
