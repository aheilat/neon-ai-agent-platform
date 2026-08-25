ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS "satisfactionRating" smallint
  CHECK ("satisfactionRating" BETWEEN 1 AND 5);
