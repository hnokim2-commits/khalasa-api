CREATE TABLE IF NOT EXISTS city_revenue_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES cities(id),
  city_share_percent numeric(5,2) NOT NULL DEFAULT 60 CHECK (city_share_percent BETWEEN 0 AND 100),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS city_revenue_rules_one_active_city
ON city_revenue_rules(COALESCE(city_id,'00000000-0000-0000-0000-000000000000'::uuid))
WHERE is_active=true AND effective_to IS NULL;

INSERT INTO city_revenue_rules(city_id,city_share_percent)
SELECT NULL,60
WHERE NOT EXISTS(SELECT 1 FROM city_revenue_rules WHERE city_id IS NULL AND is_active=true);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS city_share_percent numeric(5,2) NOT NULL DEFAULT 60 CHECK(city_share_percent BETWEEN 0 AND 100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city_admin_share numeric(12,2) NOT NULL DEFAULT 0 CHECK(city_admin_share>=0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS headquarters_share numeric(12,2) NOT NULL DEFAULT 0 CHECK(headquarters_share>=0);

UPDATE orders SET
  city_admin_share=round(platform_commission*city_share_percent/100,2),
  headquarters_share=platform_commission-round(platform_commission*city_share_percent/100,2)
WHERE city_admin_share=0 AND headquarters_share=0 AND platform_commission>0;

CREATE TABLE IF NOT EXISTS administration_revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  city_id uuid REFERENCES cities(id),
  beneficiary text NOT NULL CHECK(beneficiary IN ('city','headquarters')),
  entry_type text NOT NULL DEFAULT 'commission_share' CHECK(entry_type IN ('commission_share','reversal','adjustment','settlement')),
  amount numeric(12,2) NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,beneficiary,entry_type)
);

INSERT INTO administration_revenue_entries(order_id,city_id,beneficiary,amount,description,created_at)
SELECT id,city_id,'city',city_admin_share,'حصة إدارة المدينة من الطلب '||public_code,updated_at FROM orders WHERE status='delivered' AND city_admin_share>0
ON CONFLICT DO NOTHING;
INSERT INTO administration_revenue_entries(order_id,city_id,beneficiary,amount,description,created_at)
SELECT id,city_id,'headquarters',headquarters_share,'حصة الإدارة الرئيسية من الطلب '||public_code,updated_at FROM orders WHERE status='delivered' AND headquarters_share>0
ON CONFLICT DO NOTHING;

ALTER TABLE city_revenue_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration_revenue_entries ENABLE ROW LEVEL SECURITY;
