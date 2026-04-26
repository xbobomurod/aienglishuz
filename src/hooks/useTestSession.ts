import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TestSessionType = "reading" | "listening" | "writing" | "speaking" | "mocktest";

interface SaveTestSessionInput {
  variant?: string;
  title?: string;
  content: unknown;
}

export interface TestSession<T = unknown> {
  id: string;
  test_type: TestSessionType;
  variant: string | null;
  title: string | null;
  content: T;
  status: string;
}

export function useTestSession(testType: TestSessionType) {
  const { user } = useAuth();

  const saveSession = useCallback(async ({ variant, title, content }: SaveTestSessionInput) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("test_sessions" as any)
      .insert({
        user_id: user.id,
        test_type: testType,
        variant,
        title,
        content: content as any,
      })
      .select("id, test_type, variant, title, content, status")
      .single();

    if (error) throw error;
    return data as unknown as TestSession;
  }, [testType, user]);

  const loadSession = useCallback(async <T,>(id: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("test_sessions" as any)
      .select("id, test_type, variant, title, content, status")
      .eq("id", id)
      .eq("test_type", testType)
      .single();

    if (error) throw error;
    return data as unknown as TestSession<T>;
  }, [testType, user]);

  return { saveSession, loadSession };
}
