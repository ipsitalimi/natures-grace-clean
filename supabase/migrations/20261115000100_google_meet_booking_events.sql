-- Google Calendar / Meet integration for practitioner bookings.
ALTER TABLE public.practitioner_bookings
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS meeting_creation_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (meeting_creation_status IN ('not_started', 'created', 'retry')),
  ADD COLUMN IF NOT EXISTS meeting_creation_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS practitioner_bookings_google_event_id_unique
  ON public.practitioner_bookings (google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;
