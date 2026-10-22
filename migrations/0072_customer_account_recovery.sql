CREATE TABLE customer_account_recovery_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 request_ip_hash text NOT NULL, verification_reference text,
 reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customer_recovery_one_pending ON customer_account_recovery_requests(user_id) WHERE status='pending';
CREATE INDEX customer_recovery_queue ON customer_account_recovery_requests(status,created_at DESC);
