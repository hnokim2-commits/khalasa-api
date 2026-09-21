ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_image_url_format;

ALTER TABLE products
ADD CONSTRAINT products_image_url_format CHECK (
  image_url IS NULL OR
  image_url ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'
);
