CREATE TABLE public.saved_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word TEXT NOT NULL,
  definition TEXT,
  translation TEXT,
  context TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_words TO authenticated;
GRANT ALL ON public.saved_words TO service_role;

ALTER TABLE public.saved_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their saved words"
ON public.saved_words FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert their saved words"
ON public.saved_words FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their saved words"
ON public.saved_words FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete their saved words"
ON public.saved_words FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_saved_words_user ON public.saved_words(user_id, created_at DESC);