INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('partner-documents','partner-documents',false,4194304,ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=4194304,allowed_mime_types=EXCLUDED.allowed_mime_types;

ALTER TABLE rider_documents ADD COLUMN IF NOT EXISTS original_name text;
ALTER TABLE rider_documents ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE rider_documents ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE rider_documents ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE rider_documents ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id);
ALTER TABLE rider_documents ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE merchant_documents ADD COLUMN IF NOT EXISTS original_name text;
ALTER TABLE merchant_documents ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE merchant_documents ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE merchant_documents ADD COLUMN IF NOT EXISTS review_note text;
