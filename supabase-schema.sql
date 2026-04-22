-- Run this in the Supabase SQL Editor to set up the database

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('client','coach')),
  last_active_at TIMESTAMPTZ,
  last_message_email_sent_at TIMESTAMPTZ,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: meetings.coach_notes and pre_coaching_logs.opened_at +
-- acknowledged_at live in migration 20260422000002.

CREATE TABLE IF NOT EXISTS device_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_info (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  coach_id INTEGER NOT NULL REFERENCES users(id),
  sign_on_date TEXT,
  closing_date TEXT,
  coaching_day TEXT,
  coaching_time TEXT,
  coaching_frequency TEXT DEFAULT 'Every 2 weeks',
  payment_amount NUMERIC,
  payment_frequency TEXT CHECK(payment_frequency IN ('monthly','yearly')),
  renewal_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commitments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('commitment','practice')),
  days_of_week TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS win_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  commitment_id INTEGER NOT NULL REFERENCES commitments(id),
  date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  rating NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  recipient_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('question','flag','reply','celebration')),
  content TEXT NOT NULL DEFAULT '',
  parent_id INTEGER REFERENCES messages(id),
  read INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  reflection_time INTEGER NOT NULL DEFAULT 17,
  onboarded INTEGER NOT NULL DEFAULT 0,
  dark_mode INTEGER NOT NULL DEFAULT 0,
  reflection_snoozed_until TIMESTAMPTZ,
  reflection_skipped_date TEXT,
  rating_label TEXT DEFAULT 'inner peace',
  timezone TEXT DEFAULT 'Pacific/Honolulu'
);

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

CREATE INDEX IF NOT EXISTS idx_win_entries_user_date ON win_entries(user_id, date);
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
CREATE INDEX IF NOT EXISTS idx_meetings_client_starts ON meetings(client_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_meetings_coach_starts ON meetings(coach_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_meetings_starts_status ON meetings(starts_at, status);
CREATE INDEX IF NOT EXISTS idx_commitments_user_active ON commitments(user_id, active);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON messages(recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_archived ON messages(recipient_id, archived, read);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_client_info_coach ON client_info(coach_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_win_entries_unique ON win_entries(user_id, commitment_id, date);
