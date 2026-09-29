CREATE INDEX IF NOT EXISTS admin_audit_log_investor_activity_idx
  ON admin_audit_log ((details->>'investorId'), created_at DESC)
  WHERE action LIKE 'investor.%';

