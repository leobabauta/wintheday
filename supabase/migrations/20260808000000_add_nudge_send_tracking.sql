-- Per-slot send tracking so the nudge sender can run hourly without
-- double-sending. Stores the user's LOCAL date (YYYY-MM-DD) of the last
-- nudge delivered for that slot.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS nudges_morning_sent_date TEXT,
  ADD COLUMN IF NOT EXISTS nudges_evening_sent_date TEXT;

-- Reconcile the older `reflection_time` picker with the evening nudge.
-- Before 20260520 the reflection-time hour was the only evening-timing
-- control clients had, but nothing ever read it. Promote a genuinely-chosen
-- reflection hour into the evening nudge time so it finally takes effect.
--
-- Deliberately narrow. We only move rows where BOTH columns can be read as
-- intent: the nudge time is still its untouched '21:00' default (so nothing
-- explicit is being overwritten) AND the reflection hour is NOT its own '17'
-- default (so it reflects a real choice rather than a value the user never
-- touched). Everyone else keeps 21:00 and can change it in one tap now that
-- the control actually works.
UPDATE user_settings
SET nudges_evening_time = LPAD(reflection_time::text, 2, '0') || ':00'
WHERE nudges_evening_time = '21:00'
  AND reflection_time IS NOT NULL
  AND reflection_time BETWEEN 0 AND 23
  AND reflection_time NOT IN (17, 21);
