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
