ALTER TABLE products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE products ADD CONSTRAINT products_category_length CHECK (category IS NULL OR length(category) BETWEEN 1 AND 80);
