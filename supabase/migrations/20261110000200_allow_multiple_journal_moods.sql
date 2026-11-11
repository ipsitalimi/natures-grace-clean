-- Journal mood is stored as a delimiter-separated list. The original
-- single-value CHECK rejected multi-select and custom moods, causing valid
-- journal entries to fail persistence.
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_mood_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_mood_length_check
  CHECK (mood IS NULL OR char_length(mood) <= 100);
