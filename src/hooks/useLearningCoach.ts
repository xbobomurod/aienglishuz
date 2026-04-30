import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ListeningEvaluation, ReadingEvaluation, SpeakingEvaluation, WritingEvaluation } from "./useEvaluationHistory";

type Skill = "Reading" | "Listening" | "Writing" | "Speaking";

export interface LearningMistake {
  id: string;
  skill: Skill;
  source_type: string;
  source_id: string | null;
  prompt: string;
  user_answer: string | null;
  correct_answer: string | null;
  explanation: string;
  status: "new" | "reviewing" | "mastered";
  difficulty: number;
  review_count: number;
  next_review_at: string;
}

export interface DailyStudyTask {
  id: string;
  skill: Skill | "Vocabulary" | "Mistakes" | "Mock Test";
  title: string;
  detail: string;
  minutes: number;
  module?: "writing" | "speaking" | "reading" | "listening" | "mocktest";
}

export interface DailyStudyPlan {
  id: string;
  plan_date: string;
  target_band: number;
  focus_skill: Skill;
  next_best_action: string;
  estimated_minutes: number;
  tasks: DailyStudyTask[];
  completed_tasks: string[];
  status: string;
}

export interface VocabularyItem {
  id: string;
  topic: string;
  word: string;
  definition: string;
  example_sentence: string;
  pronunciation_hint: string | null;
  quiz_prompt: string;
  quiz_answer: string;
  repetition_level: number;
  mastery_score: number;
  next_review_at: string;
}

const targetBand = 8;

const starterVocabulary = [
  { topic: "Education", word: "curriculum", definition: "the subjects and content taught in a course", example_sentence: "A balanced curriculum should develop both academic knowledge and practical skills.", pronunciation_hint: "kuh-RIK-yuh-lum", quiz_prompt: "A school’s full list of subjects is called its ____.", quiz_answer: "curriculum" },
  { topic: "Education", word: "assessment", definition: "a way to measure performance or ability", example_sentence: "Continuous assessment can reduce the pressure of one final exam.", pronunciation_hint: "uh-SES-munt", quiz_prompt: "IELTS Writing is an ____ of grammar, vocabulary, and task response.", quiz_answer: "assessment" },
  { topic: "Environment", word: "sustainable", definition: "able to continue without damaging future resources", example_sentence: "Cities need sustainable transport systems to reduce pollution.", pronunciation_hint: "suh-STAY-nuh-bul", quiz_prompt: "Eco-friendly long-term development is ____ development.", quiz_answer: "sustainable" },
  { topic: "Environment", word: "conservation", definition: "protection of nature and resources", example_sentence: "Wildlife conservation requires government funding and public awareness.", pronunciation_hint: "kon-ser-VAY-shun", quiz_prompt: "Protecting forests and animals is nature ____.", quiz_answer: "conservation" },
  { topic: "Technology", word: "automation", definition: "using machines or software to do tasks automatically", example_sentence: "Automation can increase productivity but may replace some routine jobs.", pronunciation_hint: "aw-tuh-MAY-shun", quiz_prompt: "Robots in factories are an example of ____.", quiz_answer: "automation" },
  { topic: "Technology", word: "innovation", definition: "a new idea, method, or invention", example_sentence: "Technological innovation has transformed how students access information.", pronunciation_hint: "in-uh-VAY-shun", quiz_prompt: "A useful new invention or idea is an ____.", quiz_answer: "innovation" },
];

const asArray = (value: unknown): any[] => Array.isArray(value) ? value : [];

const answerToText = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.answer ?? record.correct_answer ?? record.text ?? record.value ?? JSON.stringify(value));
  }
  return String(value);
};

const getQuestionText = (question: unknown, fallback: string) => {
  if (!question || typeof question !== "object") return fallback;
  const record = question as Record<string, unknown>;
  return String(record.question ?? record.prompt ?? record.text ?? record.statement ?? fallback);
};

const buildDefaultTasks = (focusSkill: Skill): DailyStudyTask[] => {
  const bySkill: Record<Skill, DailyStudyTask> = {
    Reading: { id: "reading-focus", skill: "Reading", title: "Evidence reading drill", detail: "Complete one passage and underline the exact sentence that proves each answer.", minutes: 20, module: "reading" },
    Listening: { id: "listening-focus", skill: "Listening", title: "Keyword listening drill", detail: "Finish one section, then replay missed names, numbers, and distractors.", minutes: 18, module: "listening" },
    Writing: { id: "writing-focus", skill: "Writing", title: "Band 7 paragraph rewrite", detail: "Write one Task 2 body paragraph with a clear topic sentence and example.", minutes: 25, module: "writing" },
    Speaking: { id: "speaking-focus", skill: "Speaking", title: "Fluency answer upgrade", detail: "Record one Part 2 answer, then repeat with fewer pauses and stronger examples.", minutes: 15, module: "speaking" },
  };

  return [
    bySkill[focusSkill],
    { id: "mistake-review", skill: "Mistakes", title: "Review again notebook", detail: "Fix three saved mistakes and explain why the correct answer is better.", minutes: 10 },
    { id: "vocabulary-review", skill: "Vocabulary", title: "IELTS vocabulary repetition", detail: "Review due words, say them aloud, and answer mini quiz prompts.", minutes: 10 },
    { id: "exam-action", skill: "Mock Test", title: "Exam confidence step", detail: "If you have 30+ minutes, complete a timed section from your weakest skill.", minutes: 15, module: bySkill[focusSkill].module },
  ];
};

export function useLearningCoach(histories: {
  writingHistory: WritingEvaluation[];
  speakingHistory: SpeakingEvaluation[];
  readingHistory: ReadingEvaluation[];
  listeningHistory: ListeningEvaluation[];
}) {
  const { user } = useAuth();
  const [mistakes, setMistakes] = useState<LearningMistake[]>([]);
  const [dailyPlan, setDailyPlan] = useState<DailyStudyPlan | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [activity, setActivity] = useState<Array<{ activity_date: string; completed_tasks: number; minutes_studied: number; xp: number }>>([]);
  const [isCoachLoading, setIsCoachLoading] = useState(true);

  const skillScores = useMemo(() => [
    { name: "Reading" as Skill, score: histories.readingHistory[0]?.band_score ?? null },
    { name: "Listening" as Skill, score: histories.listeningHistory[0]?.band_score ?? null },
    { name: "Writing" as Skill, score: histories.writingHistory[0]?.band_score ?? null },
    { name: "Speaking" as Skill, score: histories.speakingHistory[0]?.band_score ?? null },
  ], [histories.listeningHistory, histories.readingHistory, histories.speakingHistory, histories.writingHistory]);

  const completedScores = skillScores.filter((item) => item.score !== null);
  const averageBand = completedScores.length ? completedScores.reduce((sum, item) => sum + Number(item.score), 0) / completedScores.length : 0;
  const weakSkill = ([...completedScores].sort((a, b) => Number(a.score) - Number(b.score))[0]?.name ?? "Reading") as Skill;

  const fetchLearningData = useCallback(async () => {
    if (!user) {
      setMistakes([]);
      setDailyPlan(null);
      setVocabulary([]);
      setActivity([]);
      setIsCoachLoading(false);
      return;
    }

    setIsCoachLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const client = supabase as any;

    const [mistakeResult, planResult, vocabResult, activityResult] = await Promise.all([
      client.from("learning_mistakes").select("*").order("next_review_at", { ascending: true }).limit(12),
      client.from("daily_study_plans").select("*").eq("plan_date", today).maybeSingle(),
      client.from("vocabulary_progress").select("*").order("next_review_at", { ascending: true }).limit(9),
      client.from("study_activity").select("activity_date, completed_tasks, minutes_studied, xp").gte("activity_date", format(subDays(new Date(), 20), "yyyy-MM-dd")).order("activity_date", { ascending: false }),
    ]);

    setMistakes((mistakeResult.data ?? []) as LearningMistake[]);
    setVocabulary((vocabResult.data ?? []) as VocabularyItem[]);
    setActivity(activityResult.data ?? []);

    if (planResult.data) {
      setDailyPlan({ ...planResult.data, tasks: asArray(planResult.data.tasks), completed_tasks: asArray(planResult.data.completed_tasks) } as DailyStudyPlan);
    } else {
      const tasks = buildDefaultTasks(weakSkill);
      const created = await client.from("daily_study_plans").insert({
        user_id: user.id,
        plan_date: today,
        target_band: targetBand,
        focus_skill: weakSkill,
        next_best_action: tasks[0].detail,
        estimated_minutes: tasks.reduce((sum, task) => sum + task.minutes, 0),
        tasks,
      }).select("*").single();

      if (created.data) {
        setDailyPlan({ ...created.data, tasks: asArray(created.data.tasks), completed_tasks: [] } as DailyStudyPlan);
      }
    }

    setIsCoachLoading(false);
  }, [user, weakSkill]);

  const seedVocabulary = useCallback(async () => {
    if (!user || vocabulary.length > 0) return;
    const client = supabase as any;
    await client.from("vocabulary_progress").upsert(
      starterVocabulary.map((item) => ({ ...item, user_id: user.id })),
      { onConflict: "user_id,word" }
    );
    await fetchLearningData();
  }, [fetchLearningData, user, vocabulary.length]);

  const syncMistakesFromHistory = useCallback(async () => {
    if (!user) return;
    const generated: Array<Omit<LearningMistake, "id" | "review_count" | "next_review_at" | "status"> & { user_id: string }> = [];

    histories.readingHistory.slice(0, 2).forEach((item) => {
      const questions = asArray(item.questions);
      const userAnswers = asArray(item.user_answers);
      const correctAnswers = asArray(item.correct_answers);
      correctAnswers.forEach((answer, index) => {
        const userAnswer = answerToText(userAnswers[index]);
        const correctAnswer = answerToText(answer);
        if (correctAnswer && userAnswer.toLowerCase() !== correctAnswer.toLowerCase()) {
          generated.push({ user_id: user.id, skill: "Reading", source_type: "reading_evaluation", source_id: item.id, prompt: getQuestionText(questions[index], item.passage_topic || `Reading question ${index + 1}`), user_answer: userAnswer || "No answer", correct_answer: correctAnswer, explanation: "Find the exact line in the passage that proves this answer, then compare it with your chosen option.", difficulty: 2 });
        }
      });
    });

    histories.listeningHistory.slice(0, 2).forEach((item) => {
      const questions = asArray(item.questions);
      const userAnswers = asArray(item.user_answers);
      const correctAnswers = asArray(item.correct_answers);
      correctAnswers.forEach((answer, index) => {
        const userAnswer = answerToText(userAnswers[index]);
        const correctAnswer = answerToText(answer);
        if (correctAnswer && userAnswer.toLowerCase() !== correctAnswer.toLowerCase()) {
          generated.push({ user_id: user.id, skill: "Listening", source_type: "listening_evaluation", source_id: item.id, prompt: getQuestionText(questions[index], item.audio_topic || `Listening question ${index + 1}`), user_answer: userAnswer || "No answer", correct_answer: correctAnswer, explanation: "Replay the audio around this answer and write the keyword, spelling, and distractor you heard.", difficulty: 2 });
        }
      });
    });

    histories.writingHistory.slice(0, 2).forEach((item) => {
      asArray(item.errors).slice(0, 4).forEach((error, index) => {
        const record = error as Record<string, unknown>;
        generated.push({ user_id: user.id, skill: "Writing", source_type: "writing_evaluation", source_id: item.id, prompt: String(record.mistake ?? item.topic ?? `Writing grammar issue ${index + 1}`), user_answer: String(record.mistake ?? ""), correct_answer: String(record.correction ?? "Rewrite with clearer grammar"), explanation: String(record.logic ?? record.explanation ?? item.overall_feedback ?? "Review the grammar rule and rewrite the sentence."), difficulty: 3 });
      });
    });

    histories.speakingHistory.slice(0, 2).forEach((item) => {
      asArray(item.grammar_corrections).slice(0, 4).forEach((error, index) => {
        const record = error as Record<string, unknown>;
        generated.push({ user_id: user.id, skill: "Speaking", source_type: "speaking_evaluation", source_id: item.id, prompt: String(record.mistake ?? item.topic ?? `Speaking grammar issue ${index + 1}`), user_answer: String(record.mistake ?? ""), correct_answer: String(record.correction ?? "Say it with corrected grammar"), explanation: String(record.explanation ?? item.daily_practice_tip ?? "Repeat the sentence aloud until it sounds natural."), difficulty: 3 });
      });
    });

    if (!generated.length) return;
    const client = supabase as any;
    const existing = await client.from("learning_mistakes").select("source_id, prompt").in("source_id", generated.map((item) => item.source_id).filter(Boolean));
    const existingKeys = new Set((existing.data ?? []).map((item: { source_id: string; prompt: string }) => `${item.source_id}:${item.prompt}`));
    const fresh = generated.filter((item) => !existingKeys.has(`${item.source_id}:${item.prompt}`));
    if (fresh.length) {
      await client.from("learning_mistakes").insert(fresh.slice(0, 20));
      await fetchLearningData();
    }
  }, [fetchLearningData, histories.listeningHistory, histories.readingHistory, histories.speakingHistory, histories.writingHistory, user]);

  useEffect(() => {
    fetchLearningData();
  }, [fetchLearningData]);

  useEffect(() => {
    if (!isCoachLoading) {
      seedVocabulary();
      syncMistakesFromHistory();
    }
  }, [isCoachLoading, seedVocabulary, syncMistakesFromHistory]);

  const completeTask = async (task: DailyStudyTask) => {
    if (!user || !dailyPlan || dailyPlan.completed_tasks.includes(task.id)) return;
    const completed = [...dailyPlan.completed_tasks, task.id];
    const client = supabase as any;
    await client.from("daily_study_plans").update({ completed_tasks: completed, status: completed.length >= dailyPlan.tasks.length ? "complete" : "active" }).eq("id", dailyPlan.id);
    await client.from("study_activity").upsert({ user_id: user.id, activity_date: format(new Date(), "yyyy-MM-dd"), completed_tasks: completed.length, minutes_studied: completed.reduce((sum, id) => sum + (dailyPlan.tasks.find((item) => item.id === id)?.minutes ?? 0), 0), xp: completed.length * 15 }, { onConflict: "user_id,activity_date" });
    await fetchLearningData();
  };

  const reviewMistake = async (mistake: LearningMistake) => {
    const nextCount = mistake.review_count + 1;
    const mastered = nextCount >= 3;
    await (supabase as any).from("learning_mistakes").update({
      review_count: nextCount,
      status: mastered ? "mastered" : "reviewing",
      last_reviewed_at: new Date().toISOString(),
      next_review_at: addDays(new Date(), mastered ? 14 : Math.max(1, nextCount * mistake.difficulty)).toISOString(),
    }).eq("id", mistake.id);
    await fetchLearningData();
  };

  const reviewVocabulary = async (item: VocabularyItem, remembered: boolean) => {
    const level = remembered ? item.repetition_level + 1 : 0;
    await (supabase as any).from("vocabulary_progress").update({
      repetition_level: level,
      mastery_score: remembered ? Math.min(100, item.mastery_score + 20) : Math.max(0, item.mastery_score - 10),
      last_reviewed_at: new Date().toISOString(),
      next_review_at: addDays(new Date(), remembered ? Math.max(1, level * 2) : 1).toISOString(),
    }).eq("id", item.id);
    await fetchLearningData();
  };

  const saveHighlight = async (text: string, skill: Skill = weakSkill) => {
    if (!user || !text.trim()) return;
    const cleanText = text.trim().slice(0, 600);
    await (supabase as any).from("learning_mistakes").insert({
      user_id: user.id,
      skill,
      source_type: "manual_highlight",
      prompt: cleanText,
      user_answer: "Highlighted for review",
      correct_answer: "Explain this in your own words and use it in one IELTS answer.",
      explanation: "Saved from your text highlighter. Review it again, say it aloud, then turn it into a stronger IELTS sentence.",
      difficulty: 1,
    });
    await fetchLearningData();
  };

  const streak = useMemo(() => {
    const dates = new Set(activity.filter((item) => item.completed_tasks > 0).map((item) => item.activity_date));
    let count = 0;
    for (let i = 0; i < 30; i += 1) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (!dates.has(date)) break;
      count += 1;
    }
    return count;
  }, [activity]);

  const nextReviewCount = mistakes.filter((item) => differenceInCalendarDays(parseISO(item.next_review_at), new Date()) <= 0 && item.status !== "mastered").length;
  const dueVocabulary = vocabulary.filter((item) => differenceInCalendarDays(parseISO(item.next_review_at), new Date()) <= 0);

  return {
    targetBand,
    averageBand,
    weakSkill,
    skillScores,
    mistakes,
    dailyPlan,
    vocabulary,
    dueVocabulary,
    streak,
    nextReviewCount,
    isCoachLoading,
    activity,
    completeTask,
    reviewMistake,
    reviewVocabulary,
    saveHighlight,
  };
}