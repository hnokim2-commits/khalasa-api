UPDATE city_admin_assignments
SET permissions = permissions || jsonb_build_object(
  'fleet.read', COALESCE((permissions->>'riders.read')::boolean,false),
  'fleet.manage', COALESCE((permissions->>'riders.manage')::boolean,false),
  'personnel.read', COALESCE((permissions->>'riders.read')::boolean,false),
  'personnel.manage', COALESCE((permissions->>'riders.manage')::boolean,false),
  'attendance.read', COALESCE((permissions->>'riders.read')::boolean,false),
  'attendance.manage', COALESCE((permissions->>'riders.manage')::boolean,false),
  'payroll.read', COALESCE((permissions->>'riders.read')::boolean,false),
  'payroll.manage', COALESCE((permissions->>'riders.manage')::boolean,false),
  'treasury.read', COALESCE((permissions->>'riders.read')::boolean,false),
  'treasury.manage', COALESCE((permissions->>'riders.manage')::boolean,false)
)
WHERE NOT permissions ? 'personnel.read';

INSERT INTO admin_audit_log(action,details)
VALUES('security.city_permissions_migrated','{"version":"v129","strategy":"legacy rider permissions mapped once to granular roles"}'::jsonb);
