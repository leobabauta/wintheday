ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS rating_label TEXT DEFAULT 'inner peace';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS rating NUMERIC;
