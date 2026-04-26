CREATE TABLE public.test_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('reading', 'listening', 'writing', 'speaking', 'mocktest')),
  variant TEXT,
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own test sessions"
ON public.test_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test sessions"
ON public.test_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test sessions"
ON public.test_sessions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test sessions"
ON public.test_sessions
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_test_sessions_user_type_created
ON public.test_sessions (user_id, test_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_test_sessions_updated_at
BEFORE UPDATE ON public.test_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();