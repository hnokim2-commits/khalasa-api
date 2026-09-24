ALTER TABLE merchant_applications ADD COLUMN IF NOT EXISTS activity_type text NOT NULL DEFAULT 'retail' CHECK (activity_type IN ('retail','supplier','hybrid'));
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS activity_type text NOT NULL DEFAULT 'retail' CHECK (activity_type IN ('retail','supplier','hybrid'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 100 CHECK (stock_quantity>=0), ADD COLUMN IF NOT EXISTS sale_unit text NOT NULL DEFAULT 'piece', ADD COLUMN IF NOT EXISTS wholesale_enabled boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS wholesale_min_quantity integer, ADD COLUMN IF NOT EXISTS wholesale_price numeric(12,2), ADD COLUMN IF NOT EXISTS wholesale_pack_size integer;
ALTER TABLE products ALTER COLUMN stock_quantity SET DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items(product_id);
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_wholesale_values_check;
ALTER TABLE products ADD CONSTRAINT products_wholesale_values_check CHECK (wholesale_enabled=false OR (wholesale_min_quantity>0 AND wholesale_price>=0 AND wholesale_pack_size>0));
CREATE INDEX IF NOT EXISTS merchants_activity_type_idx ON merchants(activity_type);
CREATE INDEX IF NOT EXISTS products_wholesale_idx ON products(merchant_id,wholesale_enabled) WHERE wholesale_enabled=true;
CREATE OR REPLACE FUNCTION set_merchant_activity_from_application() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT COALESCE(a.activity_type,'retail') INTO NEW.activity_type FROM merchant_applications a JOIN users u ON u.phone=a.phone WHERE u.id=NEW.owner_user_id ORDER BY a.created_at DESC LIMIT 1;
  NEW.activity_type:=COALESCE(NEW.activity_type,'retail'); RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS merchants_copy_activity_type ON merchants;
CREATE TRIGGER merchants_copy_activity_type BEFORE INSERT ON merchants FOR EACH ROW EXECUTE FUNCTION set_merchant_activity_from_application();
