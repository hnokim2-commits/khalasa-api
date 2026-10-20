-- Additive only: retain legacy keys to fail closed on pre-upgrade operations.
-- Existing middleware also protects cash remittances; include that operation.
ALTER TABLE financial_request_keys DROP CONSTRAINT financial_request_keys_operation_check;
ALTER TABLE financial_request_keys ADD CONSTRAINT financial_request_keys_operation_check
 CHECK(operation IN ('rider_withdrawal','merchant_settlement','rider_cash_remittance'));
CREATE TABLE financial_operation_results (
 bucket_key text PRIMARY KEY REFERENCES financial_request_keys(bucket_key),
 request_digest text NOT NULL CHECK(length(request_digest)=64),
 response_status integer NOT NULL CHECK(response_status BETWEEN 200 AND 299),
 response_body jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
