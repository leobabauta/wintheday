ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reflection_snoozed_until TIMESTAMPTZ;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reflection_skipped_date TEXT;
