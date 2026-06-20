-- Phase B: practitioner dashboard + availability metadata

ALTER TABLE public.practitioner_availability
  ADD COLUMN IF NOT EXISTS timing_mode TEXT DEFAULT 'same',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reviews_practitioner_id_idx
  ON public.reviews (practitioner_id)
  WHERE practitioner_id IS NOT NULL;
