CREATE TABLE IF NOT EXISTS branch_payroll_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES branch_payroll_runs(id) ON DELETE CASCADE,
  payroll_item_id uuid NOT NULL UNIQUE REFERENCES branch_payroll_items(id) ON DELETE CASCADE,
  personnel_id uuid NOT NULL REFERENCES branch_personnel(id),
  payment_method text NOT NULL CHECK(payment_method IN ('cash','bank_transfer','wallet')),
  amount numeric(12,2) NOT NULL CHECK(amount>=0),
  payment_reference text,
  receipt_code text NOT NULL UNIQUE,
  acknowledged_by text,
  acknowledged_at timestamptz,
  paid_by uuid NOT NULL REFERENCES users(id),
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  CHECK(payment_method='cash' OR length(trim(payment_reference))>=3),
  CHECK(payment_method<>'cash' OR length(trim(acknowledged_by))>=3)
);

CREATE INDEX IF NOT EXISTS branch_payroll_payments_run_idx ON branch_payroll_payments(payroll_run_id,paid_at);
CREATE UNIQUE INDEX IF NOT EXISTS branch_payroll_payment_reference_uidx ON branch_payroll_payments(payment_method,payment_reference) WHERE payment_reference IS NOT NULL;
ALTER TABLE branch_payroll_payments ENABLE ROW LEVEL SECURITY;
