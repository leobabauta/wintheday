-- Treat `rating_label` as explicitly-set-by-user or unset.
--
-- Before: column had a DB default of 'inner peace', so every client row got
-- that value automatically and the welcome flow never asked. All existing
-- clients except one (who edited it in Settings) therefore carry 'inner
-- peace' by accident, not by choice.
--
-- After: column default is NULL. A NULL value means "the user hasn't picked
-- a quality to measure" — the Today page shows a prompt card until they do.
-- The welcome flow now has a step that writes this value on new signups.
--
-- Existing rows currently holding the default string are nulled so those
-- clients see the prompt on their next Today load. Rows with any other
-- value (e.g., Adam Gordon's 'Doing') are left alone.
ALTER TABLE user_settings ALTER COLUMN rating_label DROP DEFAULT;
UPDATE user_settings SET rating_label = NULL WHERE rating_label = 'inner peace';
