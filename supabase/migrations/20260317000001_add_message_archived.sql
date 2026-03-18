ALTER TABLE messages ADD COLUMN IF NOT EXISTS archived INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_messages_archived ON messages(recipient_id, archived, read);
