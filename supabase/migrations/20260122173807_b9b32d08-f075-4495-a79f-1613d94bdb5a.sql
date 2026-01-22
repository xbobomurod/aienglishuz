-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create writing_evaluations table
CREATE TABLE public.writing_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT,
  essay TEXT NOT NULL,
  band_score NUMERIC(2,1) NOT NULL,
  task_response NUMERIC(2,1),
  coherence NUMERIC(2,1),
  lexical_resource NUMERIC(2,1),
  grammar NUMERIC(2,1),
  errors JSONB DEFAULT '[]'::jsonb,
  suggestions JSONB DEFAULT '[]'::jsonb,
  overall_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on writing_evaluations
ALTER TABLE public.writing_evaluations ENABLE ROW LEVEL SECURITY;

-- Writing evaluations policies
CREATE POLICY "Users can view their own writing evaluations"
  ON public.writing_evaluations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own writing evaluations"
  ON public.writing_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own writing evaluations"
  ON public.writing_evaluations FOR DELETE
  USING (auth.uid() = user_id);

-- Create speaking_evaluations table
CREATE TABLE public.speaking_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT,
  transcript TEXT NOT NULL,
  band_score NUMERIC(2,1) NOT NULL,
  fluency_score NUMERIC(2,1),
  vocabulary_score NUMERIC(2,1),
  grammar_score NUMERIC(2,1),
  filler_words JSONB DEFAULT '[]'::jsonb,
  vocabulary_upgrades JSONB DEFAULT '[]'::jsonb,
  grammar_corrections JSONB DEFAULT '[]'::jsonb,
  native_upgrade TEXT,
  daily_practice_tip TEXT,
  overall_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on speaking_evaluations
ALTER TABLE public.speaking_evaluations ENABLE ROW LEVEL SECURITY;

-- Speaking evaluations policies
CREATE POLICY "Users can view their own speaking evaluations"
  ON public.speaking_evaluations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own speaking evaluations"
  ON public.speaking_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own speaking evaluations"
  ON public.speaking_evaluations FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();