ALTER TABLE users
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS workplace_city_id uuid REFERENCES cities(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_job_title_length_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_job_title_length_check
      CHECK (job_title IS NULL OR char_length(btrim(job_title)) BETWEEN 2 AND 100);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_workplace_city_idx ON users(workplace_city_id);

UPDATE users u
SET workplace_city_id = a.city_id
FROM city_admin_assignments a
WHERE a.user_id = u.id
  AND u.workplace_city_id IS NULL;
