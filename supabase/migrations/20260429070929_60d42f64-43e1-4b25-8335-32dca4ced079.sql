CREATE TABLE public.learning_mistakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  prompt TEXT NOT NULL,
  user_answer TEXT,
  correct_answer TEXT,
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  difficulty INTEGER NOT NULL DEFAULT 2,
  review_count INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own learning mistakes"
ON public.learning_mistakes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning mistakes"
ON public.learning_mistakes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning mistakes"
ON public.learning_mistakes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning mistakes"
ON public.learning_mistakes
FOR DELETE
USING (auth.uid() = user_id);

CREATE TABLE public.daily_study_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_band NUMERIC NOT NULL DEFAULT 7.0,
  focus_skill TEXT NOT NULL,
  next_best_action TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 45,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date)
);

ALTER TABLE public.daily_study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily study plans"
ON public.daily_study_plans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily study plans"
ON public.daily_study_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily study plans"
ON public.daily_study_plans
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily study plans"
ON public.daily_study_plans
FOR DELETE
USING (auth.uid() = user_id);

CREATE TABLE public.vocabulary_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  example_sentence TEXT NOT NULL,
  pronunciation_hint TEXT,
  quiz_prompt TEXT NOT NULL,
  quiz_answer TEXT NOT NULL,
  repetition_level INTEGER NOT NULL DEFAULT 0,
  mastery_score INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, word)
);

ALTER TABLE public.vocabulary_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vocabulary progress"
ON public.vocabulary_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vocabulary progress"
ON public.vocabulary_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary progress"
ON public.vocabulary_progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary progress"
ON public.vocabulary_progress
FOR DELETE
USING (auth.uid() = user_id);

CREATE TABLE public.study_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  minutes_studied INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_date)
);

ALTER TABLE public.study_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own study activity"
ON public.study_activity
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study activity"
ON public.study_activity
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study activity"
ON public.study_activity
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study activity"
ON public.study_activity
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_learning_mistakes_user_review ON public.learning_mistakes(user_id, next_review_at, status);
CREATE INDEX idx_daily_study_plans_user_date ON public.daily_study_plans(user_id, plan_date DESC);
CREATE INDEX idx_vocabulary_progress_user_review ON public.vocabulary_progress(user_id, next_review_at, mastery_score);
CREATE INDEX idx_study_activity_user_date ON public.study_activity(user_id, activity_date DESC);

CREATE TRIGGER update_learning_mistakes_updated_at
BEFORE UPDATE ON public.learning_mistakes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_study_plans_updated_at
BEFORE UPDATE ON public.daily_study_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vocabulary_progress_updated_at
BEFORE UPDATE ON public.vocabulary_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_activity_updated_at
BEFORE UPDATE ON public.study_activity
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();