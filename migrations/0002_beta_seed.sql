-- Beta-only operating records for the four Khalasa applications.
-- Run this file once in Supabase SQL Editor after 0001_initial.sql.

INSERT INTO users (id, role, phone, full_name, is_phone_verified) VALUES
  ('11111111-1111-4111-8111-111111111101', 'merchant', '01000000001', 'مالك برجر ستريت', true),
  ('11111111-1111-4111-8111-111111111102', 'rider',    '01000000002', 'محمد السيد', true),
  ('11111111-1111-4111-8111-111111111103', 'admin',    '01000000003', 'مدير خالصة', true)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, is_phone_verified = true;

INSERT INTO merchants (id, owner_user_id, display_name, category, address, minimum_order, is_accepting_orders, verification)
VALUES ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111101', 'برجر ستريت', 'food', 'شارع السوق، كفر صقر', 0, true, 'approved')
ON CONFLICT (id) DO UPDATE SET is_accepting_orders = true, verification = 'approved';

INSERT INTO riders (id, user_id, vehicle_type, verification, probation_ends_at, is_available)
VALUES ('11111111-1111-4111-8111-111111111121', '11111111-1111-4111-8111-111111111102', 'motorcycle', 'approved', now() + interval '3 months', true)
ON CONFLICT (user_id) DO UPDATE SET verification = 'approved', is_available = true;
