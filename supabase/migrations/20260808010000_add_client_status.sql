-- Roster status for a coaching relationship, independent of engagement.
-- 'inactive' keeps every record (journals, wins, messages, sessions) intact
-- but drops the client out of nudges and off the main dashboard list.
--
-- NOTE: the CHECK means adding a future state ('paused', 'prospect', ...)
-- needs a migration to widen it, and an out-of-range INSERT fails at the DB
-- with a 500 rather than a validation error. Same trap as messages.type.
ALTER TABLE client_info
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

ALTER TABLE client_info DROP CONSTRAINT IF EXISTS client_info_status_check;
ALTER TABLE client_info
  ADD CONSTRAINT client_info_status_check CHECK (status IN ('active', 'inactive'));

-- Both are past their closing_date and have stopped using the app.
UPDATE client_info
SET status = 'inactive', status_changed_at = now()
WHERE user_id IN (
  SELECT id FROM users WHERE name IN ('Jeroen Meijer', 'Anne Sidebottom')
);
