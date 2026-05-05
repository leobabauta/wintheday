-- Track when a coach has seen a journal entry, so we can drop it from the
-- inbox once attended.
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS coach_opened_at TIMESTAMPTZ;

-- One row per (user, date) representing "client completed all of today's
-- commitments + practices." Dedupes the all-done notification + drives the
-- inbox row.
CREATE TABLE IF NOT EXISTS daily_completions (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  coach_opened_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS daily_completions_user_idx
  ON daily_completions(user_id);
