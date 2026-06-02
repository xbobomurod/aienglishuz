import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const GOAL_KEY = "daily-goal";
const DEFAULT_GOAL = 2;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function useStreak() {
  const { user } = useAuth();
  const [todayCount, setTodayCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [goal, setGoalState] = useState<number>(() => {
    const v = Number(localStorage.getItem(GOAL_KEY));
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_GOAL;
  });
  const [loading, setLoading] = useState(true);

  const setGoal = useCallback((n: number) => {
    const v = Math.max(1, Math.min(20, Math.round(n)));
    localStorage.setItem(GOAL_KEY, String(v));
    setGoalState(v);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const sinceIso = since.toISOString();
    const tables = [
      "reading_evaluations",
      "listening_evaluations",
      "writing_evaluations",
      "speaking_evaluations",
    ] as const;

    const results = await Promise.all(
      tables.map((t) =>
        supabase
          .from(t as any)
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", sinceIso)
      )
    );

    const days = new Set<string>();
    let today = 0;
    const todayStr = dayKey(new Date());
    results.forEach((r) => {
      (r.data || []).forEach((row: any) => {
        const k = dayKey(new Date(row.created_at));
        days.add(k);
        if (k === todayStr) today++;
      });
    });

    // streak: consecutive days back from today (or yesterday if today empty)
    let s = 0;
    const cursor = new Date();
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(dayKey(cursor))) {
      s++;
      cursor.setDate(cursor.getDate() - 1);
    }

    setTodayCount(today);
    setStreak(s);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { streak, todayCount, goal, setGoal, loading, refresh };
}