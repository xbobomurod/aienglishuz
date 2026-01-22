import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface WritingEvaluation {
  id: string;
  topic: string | null;
  essay: string;
  band_score: number;
  task_response: number | null;
  coherence: number | null;
  lexical_resource: number | null;
  grammar: number | null;
  errors: unknown;
  suggestions: unknown;
  overall_feedback: string | null;
  created_at: string;
}

export interface SpeakingEvaluation {
  id: string;
  topic: string | null;
  transcript: string;
  band_score: number;
  fluency_score: number | null;
  vocabulary_score: number | null;
  grammar_score: number | null;
  filler_words: unknown;
  vocabulary_upgrades: unknown;
  grammar_corrections: unknown;
  native_upgrade: string | null;
  daily_practice_tip: string | null;
  overall_feedback: string | null;
  created_at: string;
}

export function useEvaluationHistory() {
  const { user } = useAuth();
  const [writingHistory, setWritingHistory] = useState<WritingEvaluation[]>([]);
  const [speakingHistory, setSpeakingHistory] = useState<SpeakingEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) {
      setWritingHistory([]);
      setSpeakingHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const [writingResult, speakingResult] = await Promise.all([
      supabase
        .from("writing_evaluations")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("speaking_evaluations")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    if (writingResult.data) {
      setWritingHistory(writingResult.data as WritingEvaluation[]);
    }

    if (speakingResult.data) {
      setSpeakingHistory(speakingResult.data as SpeakingEvaluation[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const saveWritingEvaluation = async (data: {
    topic?: string;
    essay: string;
    bandScore: number;
    breakdown: {
      taskResponse: number;
      coherence: number;
      lexicalResource: number;
      grammar: number;
    };
    errors: Array<{ mistake: string; correction: string; logic: string }>;
    suggestions: string[];
    overallFeedback: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("writing_evaluations").insert({
      user_id: user.id,
      topic: data.topic || null,
      essay: data.essay,
      band_score: data.bandScore,
      task_response: data.breakdown.taskResponse,
      coherence: data.breakdown.coherence,
      lexical_resource: data.breakdown.lexicalResource,
      grammar: data.breakdown.grammar,
      errors: data.errors,
      suggestions: data.suggestions,
      overall_feedback: data.overallFeedback
    });

    if (!error) {
      await fetchHistory();
    }

    return { error };
  };

  const saveSpeakingEvaluation = async (data: {
    topic?: string;
    transcript: string;
    bandScore: number;
    fluencyScore: number;
    vocabularyScore: number;
    grammarScore: number;
    fillerWords: Array<{ word: string; count: number; suggestion: string }>;
    vocabularyUpgrades: Array<{ original: string; upgrade: string; example: string }>;
    grammarCorrections: Array<{ mistake: string; correction: string; explanation: string }>;
    nativeUpgrade: string;
    dailyPracticeTip: string;
    overallFeedback: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("speaking_evaluations").insert({
      user_id: user.id,
      topic: data.topic || null,
      transcript: data.transcript,
      band_score: data.bandScore,
      fluency_score: data.fluencyScore,
      vocabulary_score: data.vocabularyScore,
      grammar_score: data.grammarScore,
      filler_words: data.fillerWords,
      vocabulary_upgrades: data.vocabularyUpgrades,
      grammar_corrections: data.grammarCorrections,
      native_upgrade: data.nativeUpgrade,
      daily_practice_tip: data.dailyPracticeTip,
      overall_feedback: data.overallFeedback
    });

    if (!error) {
      await fetchHistory();
    }

    return { error };
  };

  const getLastWritingScore = () => {
    if (writingHistory.length === 0) return null;
    return writingHistory[0].band_score;
  };

  const getLastSpeakingScore = () => {
    if (speakingHistory.length === 0) return null;
    return speakingHistory[0].band_score;
  };

  const getPreviousWritingScore = () => {
    if (writingHistory.length < 2) return null;
    return writingHistory[1].band_score;
  };

  const getPreviousSpeakingScore = () => {
    if (speakingHistory.length < 2) return null;
    return speakingHistory[1].band_score;
  };

  return {
    writingHistory,
    speakingHistory,
    isLoading,
    saveWritingEvaluation,
    saveSpeakingEvaluation,
    getLastWritingScore,
    getLastSpeakingScore,
    getPreviousWritingScore,
    getPreviousSpeakingScore,
    refetch: fetchHistory
  };
}
