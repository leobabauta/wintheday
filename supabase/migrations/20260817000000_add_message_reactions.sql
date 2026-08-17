-- Emoji reactions on chat messages.
-- One row per (message, user, emoji): a user may add several distinct
-- reactions to the same message, and tapping the same emoji again removes it.
-- Cascade on message delete so removing a message takes its reactions with it.

CREATE TABLE IF NOT EXISTS message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reactions_unique
  ON message_reactions(message_id, user_id, emoji);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON message_reactions(message_id);
