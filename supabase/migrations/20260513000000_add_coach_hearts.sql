-- Coach can heart a client's reflection or daily completion from the inbox.
-- Sets timestamp on the underlying row, fires a notification to the client.
-- One-way: no un-heart action in v1.
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS coach_heart_at TIMESTAMPTZ;

ALTER TABLE daily_completions
  ADD COLUMN IF NOT EXISTS coach_heart_at TIMESTAMPTZ;
