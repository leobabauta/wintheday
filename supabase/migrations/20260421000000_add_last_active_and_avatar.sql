-- Track last active time per user (for coach dashboard "Last active" column)
-- and allow a per-user avatar image (stored as a base64 data URL).
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
