-- Coach-only notes per session.
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS coach_notes TEXT;

-- Tracks whether the coach has opened the submitted pre-coaching form
-- (drives the dashboard alert dot + inbox inclusion).
ALTER TABLE pre_coaching_logs ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

-- Tracks whether the coach has clicked "Acknowledge & thank" for this log,
-- so the button only fires once per submission.
ALTER TABLE pre_coaching_logs ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
