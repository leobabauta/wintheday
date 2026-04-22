-- Throttle timestamp for "new message" notification emails (one per recipient
-- per ~15 min). See src/lib/message-notifications.ts for the send logic.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_message_email_sent_at TIMESTAMPTZ;
