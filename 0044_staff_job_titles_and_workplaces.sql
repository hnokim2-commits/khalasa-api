UPDATE city_admin_assignments
SET permissions = permissions || jsonb_build_object(
  'orders.assign', COALESCE((permissions->>'orders.manage')::boolean,false),
  'riders.availability.manage', COALESCE((permissions->>'riders.manage')::boolean,false),
  'fleet.employment.manage', COALESCE((permissions->>'fleet.manage')::boolean,false),
  'fleet.assets.manage', COALESCE((permissions->>'fleet.manage')::boolean,false),
  'personnel.documents.read', COALESCE((permissions->>'personnel.read')::boolean,false),
  'personnel.documents.manage', COALESCE((permissions->>'personnel.manage')::boolean,false),
  'attendance.settings.manage', COALESCE((permissions->>'attendance.manage')::boolean,false),
  'attendance.access.manage', COALESCE((permissions->>'attendance.manage')::boolean,false),
  'attendance.shifts.manage', COALESCE((permissions->>'attendance.manage')::boolean,false),
  'attendance.corrections.manage', COALESCE((permissions->>'attendance.manage')::boolean,false),
  'attendance.records.manage', COALESCE((permissions->>'attendance.manage')::boolean,false),
  'payroll.policy.manage', COALESCE((permissions->>'payroll.manage')::boolean,false),
  'payroll.adjustments.manage', COALESCE((permissions->>'payroll.manage')::boolean,false),
  'payroll.submit', COALESCE((permissions->>'payroll.manage')::boolean,false),
  'treasury.expenses.create', COALESCE((permissions->>'treasury.manage')::boolean,false),
  'treasury.receipts.read', COALESCE((permissions->>'treasury.read')::boolean,false),
  'treasury.advances.create', COALESCE((permissions->>'treasury.manage')::boolean,false),
  'treasury.settlements.create', COALESCE((permissions->>'treasury.manage')::boolean,false)
)
WHERE NOT permissions ? 'attendance.records.manage';

INSERT INTO admin_audit_log(action,details)
VALUES('security.city_detailed_permissions_migrated','{"version":"v130","strategy":"parent permissions mapped once to detailed actions"}'::jsonb);
