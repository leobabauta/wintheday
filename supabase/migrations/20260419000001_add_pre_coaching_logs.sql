CREATE TABLE IF NOT EXISTS pre_coaching_logs (
  id SERIAL PRIMARY KEY,
  meeting_id INTEGER NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id),
  coach_id INTEGER NOT NULL REFERENCES users(id),
  responses JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_coaching_client ON pre_coaching_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_pre_coaching_coach ON pre_coaching_logs(coach_id, submitted_at);
