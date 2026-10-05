CREATE TABLE IF NOT EXISTS branch_cash_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id),
  personnel_id uuid NOT NULL REFERENCES branch_personnel(id),
  amount numeric(12,2) NOT NULL CHECK(amount>0 AND amount<=1000000),
  purpose text NOT NULL CHECK(length(trim(purpose)) BETWEEN 3 AND 500),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected','paid','partially_settled','settled')),
  requested_by uuid NOT NULL REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text,
  paid_by uuid REFERENCES users(id),
  paid_at timestamptz,
  payment_method text CHECK(payment_method IS NULL OR payment_method IN ('cash','bank_transfer','wallet')),
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(due_date>=created_at::date)
);

CREATE TABLE IF NOT EXISTS branch_cash_advance_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id uuid NOT NULL REFERENCES branch_cash_advances(id) ON DELETE CASCADE,
  spent_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK(spent_amount>=0),
  returned_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK(returned_amount>=0),
  description text NOT NULL CHECK(length(trim(description)) BETWEEN 3 AND 500),
  receipt_storage_key text,
  receipt_original_name text,
  receipt_mime_type text CHECK(receipt_mime_type IS NULL OR receipt_mime_type IN ('image/jpeg','image/png','application/pdf')),
  receipt_file_size integer CHECK(receipt_file_size IS NULL OR receipt_file_size BETWEEN 1 AND 4194304),
  status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),
  submitted_by uuid NOT NULL REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(spent_amount+returned_amount>0)
);

CREATE UNIQUE INDEX IF NOT EXISTS branch_cash_advance_one_open_uidx ON branch_cash_advances(personnel_id) WHERE status IN ('submitted','approved','paid','partially_settled');
CREATE INDEX IF NOT EXISTS branch_cash_advances_city_status_idx ON branch_cash_advances(city_id,status,due_date);
CREATE INDEX IF NOT EXISTS branch_cash_advance_settlements_review_idx ON branch_cash_advance_settlements(status,created_at);
ALTER TABLE branch_cash_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_cash_advance_settlements ENABLE ROW LEVEL SECURITY;
