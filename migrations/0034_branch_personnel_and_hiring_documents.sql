CREATE TABLE IF NOT EXISTS branch_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id),
  rider_id uuid UNIQUE REFERENCES riders(id) ON DELETE SET NULL,
  full_name text NOT NULL CHECK(length(trim(full_name)) BETWEEN 3 AND 120),
  phone varchar(20) NOT NULL,
  job_title text NOT NULL CHECK(length(trim(job_title)) BETWEEN 2 AND 100),
  personnel_type text NOT NULL DEFAULT 'employee' CHECK(personnel_type IN ('employee','rider')),
  monthly_salary numeric(12,2) NOT NULL DEFAULT 0 CHECK(monthly_salary>=0),
  hire_date date NOT NULL DEFAULT current_date,
  contract_end_date date,
  employment_status text NOT NULL DEFAULT 'active' CHECK(employment_status IN ('active','probation','suspended','ended')),
  notes text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(contract_end_date IS NULL OR contract_end_date>=hire_date),
  UNIQUE(city_id,phone)
);

CREATE TABLE IF NOT EXISTS branch_personnel_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES branch_personnel(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK(document_type IN ('national_id','qualification','criminal_record','driving_license','employment_contract','insurance_form','medical_certificate','other')),
  private_storage_key text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','application/pdf')),
  file_size integer NOT NULL CHECK(file_size>0 AND file_size<=4194304),
  verification verification_status NOT NULL DEFAULT 'pending',
  expiry_date date,
  review_note text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(personnel_id,document_type)
);

CREATE INDEX IF NOT EXISTS branch_personnel_city_status_idx ON branch_personnel(city_id,employment_status);
CREATE INDEX IF NOT EXISTS branch_personnel_documents_review_idx ON branch_personnel_documents(verification,expiry_date);
ALTER TABLE branch_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_personnel_documents ENABLE ROW LEVEL SECURITY;
