CREATE TABLE IF NOT EXISTS branch_cash_accounts (
  city_id uuid PRIMARY KEY REFERENCES cities(id),
  opening_balance numeric(14,2) NOT NULL DEFAULT 0 CHECK(opening_balance>=0),
  low_balance_threshold numeric(14,2) NOT NULL DEFAULT 1000 CHECK(low_balance_threshold>=0),
  configured_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branch_expense_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id),
  category text NOT NULL CHECK(category IN ('fuel','maintenance','rent','utilities','equipment','communications','salary','other')),
  amount numeric(12,2) NOT NULL CHECK(amount>0 AND amount<=1000000),
  description text NOT NULL CHECK(length(trim(description)) BETWEEN 3 AND 500),
  expense_date date NOT NULL DEFAULT current_date,
  receipt_storage_key text,
  receipt_original_name text,
  receipt_mime_type text CHECK(receipt_mime_type IS NULL OR receipt_mime_type IN ('image/jpeg','image/png','application/pdf')),
  receipt_file_size integer CHECK(receipt_file_size IS NULL OR receipt_file_size BETWEEN 1 AND 4194304),
  status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected','paid')),
  requested_by uuid NOT NULL REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text,
  paid_by uuid REFERENCES users(id),
  paid_at timestamptz,
  payment_method text CHECK(payment_method IS NULL OR payment_method IN ('cash','bank_transfer','wallet')),
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branch_cash_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id),
  entry_type text NOT NULL CHECK(entry_type IN ('deposit','expense','payroll','adjustment')),
  direction text NOT NULL CHECK(direction IN ('credit','debit')),
  amount numeric(14,2) NOT NULL CHECK(amount>0),
  description text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  reference text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS branch_cash_ledger_source_uidx ON branch_cash_ledger(source_type,source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS branch_expense_city_status_idx ON branch_expense_requests(city_id,status,created_at);
CREATE INDEX IF NOT EXISTS branch_cash_ledger_city_date_idx ON branch_cash_ledger(city_id,created_at);
ALTER TABLE branch_cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_cash_ledger ENABLE ROW LEVEL SECURITY;
