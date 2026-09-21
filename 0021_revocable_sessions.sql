ALTER TABLE riders
ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE riders
DROP CONSTRAINT IF EXISTS riders_image_url_format;

ALTER TABLE riders
ADD CONSTRAINT riders_image_url_format CHECK (
  image_url IS NULL OR
  image_url ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'
);
