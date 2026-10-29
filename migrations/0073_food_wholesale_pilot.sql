-- Explicit LOCAL candidate migration only. Not in production startup migration chain.
CREATE TABLE food_wholesale_enrollments (
 merchant_id uuid PRIMARY KEY REFERENCES merchants(id),
 kind text NOT NULL CHECK(kind IN ('supplier','buyer')),
 active boolean NOT NULL DEFAULT false,
 review_reference text NOT NULL CHECK(length(btrim(review_reference)) BETWEEN 1 AND 500),
 reviewed_by uuid NOT NULL REFERENCES users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- Pilot: at most one active factory. No mass activation or legacy activity-type shortcut.
CREATE UNIQUE INDEX food_wholesale_single_factory ON food_wholesale_enrollments ((true)) WHERE kind='supplier' AND active;
CREATE TABLE food_wholesale_profiles (
 product_id uuid PRIMARY KEY REFERENCES products(id),
 batch_code text NOT NULL CHECK(length(btrim(batch_code)) BETWEEN 1 AND 80),
 production_date date NOT NULL,
 expiry_date date NOT NULL CHECK(expiry_date>production_date),
 units_per_carton integer NOT NULL CHECK(units_per_carton BETWEEN 1 AND 10000),
 unit_weight_grams integer NOT NULL CHECK(unit_weight_grams BETWEEN 1 AND 1000000),
 storage text NOT NULL CHECK(storage='ambient_packaged'),
 storage_instructions text NOT NULL CHECK(length(btrim(storage_instructions)) BETWEEN 1 AND 500),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE food_wholesale_workflows (
 request_id uuid PRIMARY KEY REFERENCES wholesale_requests(id),
 revision integer NOT NULL CHECK(revision>0),
 state jsonb NOT NULL CHECK(jsonb_typeof(state)='object' AND state ?& ARRAY['id','status','revision']),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((state->>'revision')::integer=revision AND state->>'id'=request_id::text)
);
CREATE TABLE food_wholesale_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id uuid NOT NULL REFERENCES users(id),
 action text NOT NULL,
 entity_id uuid NOT NULL,
 snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE food_wholesale_operation_results (
 actor_user_id uuid NOT NULL REFERENCES users(id),
 operation_key text NOT NULL CHECK(length(operation_key) BETWEEN 16 AND 100),
 digest text NOT NULL CHECK(length(digest)=64),
 response jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(actor_user_id,operation_key)
);
CREATE FUNCTION guard_food_wholesale_legacy_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 -- Serialize legacy writes with profile adoption and stock acceptance.
 PERFORM 1 FROM products WHERE id=NEW.product_id FOR UPDATE;
 IF (EXISTS(SELECT 1 FROM food_wholesale_profiles WHERE product_id=NEW.product_id)
     OR (TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM food_wholesale_workflows WHERE request_id=OLD.id)))
    AND current_setting('khalasa.food_wholesale',true) IS DISTINCT FROM 'on' THEN
   RAISE EXCEPTION 'FOOD_WHOLESALE_FLOW_REQUIRED' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER food_wholesale_legacy_write_guard BEFORE INSERT OR UPDATE ON wholesale_requests FOR EACH ROW EXECUTE FUNCTION guard_food_wholesale_legacy_write();
-- No direct anonymous/authenticated-client access to the new private tables.
-- API test connects with the isolated database owner; live DB role review is pending.
ALTER TABLE food_wholesale_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_wholesale_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_wholesale_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_wholesale_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_wholesale_operation_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON food_wholesale_enrollments,food_wholesale_profiles,food_wholesale_workflows,food_wholesale_events,food_wholesale_operation_results FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
   EXECUTE format('REVOKE ALL ON food_wholesale_enrollments,food_wholesale_profiles,food_wholesale_workflows,food_wholesale_events,food_wholesale_operation_results FROM %I',role_name);
  END IF;
 END LOOP;
END $$;
