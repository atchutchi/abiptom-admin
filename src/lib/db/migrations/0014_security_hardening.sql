CREATE TABLE IF NOT EXISTS security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action varchar(80) NOT NULL,
  subject_hash varchar(64) NOT NULL,
  window_started_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT security_rate_limits_action_subject_uq
    UNIQUE (action, subject_hash)
);

CREATE INDEX IF NOT EXISTS security_rate_limits_blocked_idx
  ON security_rate_limits (blocked_until);

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS resultado varchar(20) NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS severidade varchar(20) NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS request_id varchar(100);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_result_created_at_idx
  ON audit_log (resultado, created_at DESC);
