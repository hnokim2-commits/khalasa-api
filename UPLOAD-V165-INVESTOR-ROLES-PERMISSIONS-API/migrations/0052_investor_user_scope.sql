ALTER TABLE investor_user_assignments
ADD COLUMN IF NOT EXISTS scope_all_departments boolean NOT NULL DEFAULT false;

UPDATE investor_user_assignments
SET scope_all_departments=true
WHERE lower(job_title) IN ('investor owner','owner','مالك المستثمر');

CREATE INDEX IF NOT EXISTS investor_user_assignments_scope_idx
ON investor_user_assignments(investor_id,scope_all_departments,is_active);
