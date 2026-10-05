CREATE TABLE IF NOT EXISTS wholesale_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_merchant_id uuid NOT NULL REFERENCES merchants(id),
  supplier_merchant_id uuid NOT NULL REFERENCES merchants(id),
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK(quantity>0),
  requested_unit_price numeric(12,2),
  quoted_unit_price numeric(12,2),
  status text NOT NULL DEFAULT 'requested' CHECK(status IN('requested','quoted','accepted','rejected','cancelled','fulfilled')),
  buyer_note text,
  supplier_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(buyer_merchant_id<>supplier_merchant_id)
);
CREATE INDEX IF NOT EXISTS wholesale_requests_buyer_idx ON wholesale_requests(buyer_merchant_id,created_at DESC);
CREATE INDEX IF NOT EXISTS wholesale_requests_supplier_idx ON wholesale_requests(supplier_merchant_id,status,created_at DESC);
