
CREATE TABLE public.cached_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type text NOT NULL CHECK (test_type IN ('reading', 'listening')),
  difficulty_key text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cached_tests_type_key_idx ON public.cached_tests (test_type, difficulty_key);
GRANT SELECT ON public.cached_tests TO authenticated;
GRANT ALL ON public.cached_tests TO service_role;
ALTER TABLE public.cached_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read cached tests"
  ON public.cached_tests FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_test_views (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cached_test_id uuid NOT NULL REFERENCES public.cached_tests(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cached_test_id)
);
CREATE INDEX user_test_views_user_idx ON public.user_test_views (user_id);
GRANT SELECT, INSERT, DELETE ON public.user_test_views TO authenticated;
GRANT ALL ON public.user_test_views TO service_role;
ALTER TABLE public.user_test_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own views"
  ON public.user_test_views FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
