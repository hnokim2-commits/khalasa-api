-- Staging build only. Separate test grants, never legal/document/merchant approval.
CREATE TABLE food_wholesale_test_grants (
 merchant_id uuid PRIMARY KEY REFERENCES merchants(id),
 kind text NOT NULL UNIQUE CHECK(kind IN('supplier','buyer')),
 active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL CHECK(expires_at>created_at AND expires_at<=created_at+interval '24 hours'),
 reviewed_by uuid NOT NULL REFERENCES users(id),
 reference text NOT NULL CHECK(length(btrim(reference)) BETWEEN 1 AND 500),
 product_id uuid REFERENCES products(id)
);
ALTER TABLE food_wholesale_test_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON food_wholesale_test_grants FROM PUBLIC;
DO $$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON food_wholesale_test_grants FROM %I',r); END IF; END LOOP; END $$;
CREATE FUNCTION food_wholesale_is_test_grant(id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM food_wholesale_test_grants g JOIN merchants m ON m.id=g.merchant_id JOIN users u ON u.id=m.owner_user_id WHERE g.merchant_id=$1 AND g.active AND g.expires_at>now() AND m.verification='pending' AND m.display_name LIKE 'TEST ONLY | Khalasa food %' AND u.account_status='active' AND u.archived_at IS NULL)
$$;
REVOKE ALL ON FUNCTION food_wholesale_is_test_grant(uuid) FROM PUBLIC;
CREATE FUNCTION guard_food_fixture_not_real_approval() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.verification='approved' AND EXISTS(SELECT 1 FROM food_wholesale_test_grants WHERE merchant_id=NEW.id) THEN RAISE EXCEPTION 'TEST_FIXTURE_NOT_REAL_BUSINESS_APPROVAL' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER food_fixture_no_real_approval BEFORE UPDATE OF verification ON merchants FOR EACH ROW EXECUTE FUNCTION guard_food_fixture_not_real_approval();
