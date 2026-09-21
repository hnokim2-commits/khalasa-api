ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE merchants
DROP CONSTRAINT IF EXISTS merchants_image_url_format;

ALTER TABLE merchants
ADD CONSTRAINT merchants_image_url_format CHECK (
  image_url IS NULL OR
  image_url ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'
);
