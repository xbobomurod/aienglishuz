import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface SavedWord {
  id: string;
  word: string;
  definition: string | null;
  translation: string | null;
  context: string | null;
  source: string | null;
  created_at: string;
}

export function useSavedWords() {
  const { user } = useAuth();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_words" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error && data) setWords(data as unknown as SavedWord[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (word: string, opts: { context?: string; source?: string } = {}) => {
      const cleaned = word.trim();
      if (!cleaned || !user) return;
      if (cleaned.length > 80) {
        toast.error("Selection too long for a word.");
        return;
      }
      const { data, error } = await supabase
        .from("saved_words" as any)
        .insert({
          user_id: user.id,
          word: cleaned,
          context: opts.context?.slice(0, 500) || null,
          source: opts.source || null,
        })
        .select()
        .single();
      if (error) {
        toast.error("Could not save word.");
        return;
      }
      setWords((prev) => [data as unknown as SavedWord, ...prev]);
      toast.success(`Saved "${cleaned}"`);
    },
    [user]
  );

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("saved_words" as any).delete().eq("id", id);
    if (error) {
      toast.error("Could not remove word.");
      return;
    }
    setWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return { words, loading, add, remove, refresh };
}