-- Optional course metadata (instructor, locations) on resources

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
