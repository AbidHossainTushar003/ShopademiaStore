ALTER TABLE audit_logs
  ADD COLUMN before_summary JSON NULL,
  ADD COLUMN after_summary JSON NULL;
