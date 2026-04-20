CREATE TABLE IF NOT EXISTS coach_integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  google_refresh_token TEXT,
  google_calendar_email TEXT,
  cal_com_reschedule_url TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  coach_id INTEGER NOT NULL REFERENCES users(id),
  client_id INTEGER NOT NULL REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  google_event_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','cancelled','completed')),
  reschedule_requested_at TIMESTAMPTZ,
  reschedule_requested_by INTEGER REFERENCES users(id),
  day_before_reminder_sent_at TIMESTAMPTZ,
  day_of_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_client_starts ON meetings(client_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_meetings_coach_starts ON meetings(coach_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_meetings_starts_status ON meetings(starts_at, status);
