-- Run this in the Supabase SQL Editor to set up the database

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('client','coach')),
  created_at TIMESTAMPTZ DEFAULT now()
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
  reflection_skipped_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_win_entries_user_date ON win_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_commitments_user_active ON commitments(user_id, active);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON messages(recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_archived ON messages(recipient_id, archived, read);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_client_info_coach ON client_info(coach_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_win_entries_unique ON win_entries(user_id, commitment_id, date);
