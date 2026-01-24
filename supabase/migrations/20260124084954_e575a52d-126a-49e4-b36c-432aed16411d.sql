-- Create reading_evaluations table
CREATE TABLE public.reading_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  passage_topic text,
  passage_text text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  band_score numeric NOT NULL,
  correct_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  time_taken_seconds integer,
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create listening_evaluations table
CREATE TABLE public.listening_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  audio_topic text,
  transcript text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  band_score numeric NOT NULL,
  correct_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  time_taken_seconds integer,
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.reading_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS policies for reading_evaluations
CREATE POLICY "Users can view their own reading evaluations"
ON public.reading_evaluations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading evaluations"
ON public.reading_evaluations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading evaluations"
ON public.reading_evaluations FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for listening_evaluations
CREATE POLICY "Users can view their own listening evaluations"
ON public.listening_evaluations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own listening evaluations"
ON public.listening_evaluations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listening evaluations"
ON public.listening_evaluations FOR DELETE
USING (auth.uid() = user_id);