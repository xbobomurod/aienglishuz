import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flame,
  Headphones,
  Mic,
  PenLine,
  Repeat2,
  SearchCheck,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  WalletCards,
  Quote,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEvaluationHistory } from "@/hooks/useEvaluationHistory";
import { DailyStudyTask, useLearningCoach } from "@/hooks/useLearningCoach";

interface LearningModuleProps {
  onBack: () => void;
  onSelectModule: (module: "writing" | "speaking" | "reading" | "listening" | "mocktest") => void;
}

const moduleIcons = {
  Reading: BookOpenCheck,
  Listening: Headphones,
  Writing: PenLine,
  Speaking: Mic,
};

export function LearningModule({ onBack, onSelectModule }: LearningModuleProps) {
  const histories = useEvaluationHistory();
  const coach = useLearningCoach(histories);
  const [highlightText, setHighlightText] = useState("");
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  const progress = Math.min(100, Math.round((coach.averageBand / coach.targetBand) * 100));
  const completedTaskCount = coach.dailyPlan?.completed_tasks.length ?? 0;
  const totalTaskCount = coach.dailyPlan?.tasks.length ?? 4;
  const nextTask = coach.dailyPlan?.tasks.find((task) => !coach.dailyPlan?.completed_tasks.includes(task.id));
  const weakSkillTask = coach.dailyPlan?.tasks.find((task) => task.skill === coach.weakSkill);
  const reminderCount = coach.nextReviewCount + coach.dueVocabulary.length;
  const savedHighlights = coach.mistakes.filter((item) => item.source_type === "manual_highlight");
  const activeHighlight = savedHighlights.find((item) => item.id === activeHighlightId) ?? savedHighlights[0];
  const calendarDays = useMemo(() => {
    const activityMap = new Map(coach.activity.map((item) => [item.activity_date, item]));
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      const key = date.toISOString().slice(0, 10);
      return { key, label: date.toLocaleDateString("en", { weekday: "short" }).slice(0, 1), active: (activityMap.get(key)?.completed_tasks ?? 0) > 0 };
    });
  }, [coach.activity]);

  const startTask = async (task: DailyStudyTask) => {
    await coach.completeTask(task);
    if (task.module) onSelectModule(task.module);
  };

  const speakWord = (word: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  };

  const saveSelectedHighlight = async () => {
    const selected = window.getSelection()?.toString().trim();
    await coach.saveHighlight(selected || highlightText, coach.weakSkill);
    setHighlightText("");
    window.getSelection()?.removeAllRanges();
  };

  const formatReviewDate = (value: string) => new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });

  // Daily English booster — rotates by day of year, no extra data needed
  const DAILY_IDIOMS: { phrase: string; meaning: string; example: string }[] = [
    { phrase: "Hit the books", meaning: "to study very hard", example: "I need to hit the books — my IELTS test is next week." },
    { phrase: "A blessing in disguise", meaning: "something that seems bad but is actually good", example: "Failing my first mock was a blessing in disguise — it showed me my weak areas." },
    { phrase: "Once in a blue moon", meaning: "very rarely", example: "I only watch TV once in a blue moon these days." },
    { phrase: "Cut corners", meaning: "to do something in the easiest, cheapest way", example: "Don't cut corners on your Task 2 essay — examiners notice." },
    { phrase: "Get the hang of it", meaning: "to learn how to do something", example: "It took a month, but I finally got the hang of cue-card timing." },
    { phrase: "On the same page", meaning: "to be in agreement", example: "Make sure you and the examiner are on the same page about the topic." },
    { phrase: "Off the top of my head", meaning: "without thinking carefully", example: "Off the top of my head, I'd say tourism is the biggest issue." },
    { phrase: "A piece of cake", meaning: "very easy", example: "Section 1 of Listening is usually a piece of cake." },
    { phrase: "Beat around the bush", meaning: "to avoid saying something directly", example: "In Part 3, don't beat around the bush — state your opinion clearly." },
    { phrase: "Burn the midnight oil", meaning: "to study or work late at night", example: "She burned the midnight oil preparing for her writing test." },
    { phrase: "Spill the beans", meaning: "to reveal a secret", example: "Don't spill the beans about the topics before the exam." },
    { phrase: "Bite the bullet", meaning: "to accept something difficult", example: "I bit the bullet and rewrote my whole Task 2 essay." },
  ];
  const TONGUE_TWISTERS = [
    "She sells seashells by the seashore.",
    "Peter Piper picked a peck of pickled peppers.",
    "How can a clam cram in a clean cream can?",
    "Red lorry, yellow lorry, red lorry, yellow lorry.",
    "The sixth sick sheikh's sixth sheep's sick.",
    "Truly rural, truly rural, truly rural.",
    "Unique New York, unique New York.",
  ];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const idiomOfDay = DAILY_IDIOMS[dayOfYear % DAILY_IDIOMS.length];
  const tongueTwisterOfDay = TONGUE_TWISTERS[dayOfYear % TONGUE_TWISTERS.length];

  return (
    <div className="animate-fade-in space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="p-5 md:p-7">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" /> Daily IELTS Coach
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Flame className="h-3 w-3 text-accent" /> {coach.streak} day streak
              </Badge>
            </div>

            <h1 className="font-display text-3xl font-bold leading-tight text-foreground md:text-5xl">
              Your automatic study program is ready
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Today’s dashboard updates from your latest IELTS results, saves mistakes into review practice, and schedules vocabulary repetition automatically.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-primary/10 p-4">
                <Target className="mb-2 h-5 w-5 text-primary" />
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="font-bold text-foreground">Band {coach.targetBand}.0</p>
              </div>
              <div className="rounded-xl bg-secondary p-4">
                <Brain className="mb-2 h-5 w-5 text-primary" />
                <p className="text-xs text-muted-foreground">Weak skill</p>
                <p className="font-bold text-foreground">{coach.weakSkill}</p>
              </div>
              <div className="rounded-xl bg-accent/10 p-4">
                <WalletCards className="mb-2 h-5 w-5 text-accent" />
                <p className="text-xs text-muted-foreground">Due mistakes</p>
                <p className="font-bold text-foreground">{coach.nextReviewCount}</p>
              </div>
              <div className="rounded-xl bg-success/10 p-4">
                <Trophy className="mb-2 h-5 w-5 text-success" />
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="font-bold text-foreground">{coach.averageBand ? coach.averageBand.toFixed(1) : "Start"}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Sparkles className="h-4 w-4" /> Highlight priority</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{nextTask?.title ?? "All tasks complete"}</p>
              </div>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-destructive"><AlertCircle className="h-4 w-4" /> Smart reminders</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{reminderCount} review actions due</p>
              </div>
              <div className="rounded-xl border border-accent/20 bg-accent/10 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-accent"><SearchCheck className="h-4 w-4" /> Weak-skill drill</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{weakSkillTask?.title ?? `${coach.weakSkill} focused practice`}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-secondary/50 p-5 md:p-7 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-foreground">Road to Band {coach.targetBand}.0</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="mt-6 space-y-3">
              {coach.skillScores.map((skill) => {
                const Icon = moduleIcons[skill.name];
                return (
                  <div key={skill.name} className="flex items-center justify-between rounded-xl bg-card p-3 shadow-soft">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-medium">{skill.name}</span>
                    </div>
                    <Badge variant="outline">{skill.score ? `Band ${skill.score}` : "Start"}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold">Today’s program</h2>
              </div>
              <Badge variant="secondary">{completedTaskCount}/{totalTaskCount} complete</Badge>
            </div>
            {nextTask && (
              <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-4 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Next best action</p>
                <p className="mt-1 font-semibold text-foreground">{nextTask.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{nextTask.detail}</p>
              </div>
            )}
            <div className="space-y-3">
              {(coach.dailyPlan?.tasks ?? []).map((task, index) => {
                const done = coach.dailyPlan?.completed_tasks.includes(task.id);
                return (
                  <button key={task.id} onClick={() => startTask(task)} className={`group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all hover:border-primary/30 hover:bg-secondary/70 ${task.id === nextTask?.id ? "border-primary/40 bg-primary/5 shadow-soft" : task.skill === coach.weakSkill ? "border-accent/40 bg-accent/10" : "border-border"}`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}`}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{task.title}</span>
                        <Badge variant="secondary">{task.skill}</Badge>
                        <Badge variant="outline">{task.minutes} min</Badge>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">{task.detail}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Real mistake notebook</h2>
            </div>
            <div className="mb-4 rounded-xl border border-primary/20 bg-secondary/50 p-3">
              <p className="text-xs font-semibold uppercase text-primary">Text highlighter</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Select any sentence on this page, or paste text below, then save it for review.</p>
              <textarea value={highlightText} onChange={(event) => setHighlightText(event.target.value)} placeholder="Paste a difficult word, phrase, or grammar mistake..." className="mt-3 min-h-20 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
              <Button size="sm" className="mt-2 w-full" onClick={saveSelectedHighlight} disabled={!highlightText.trim() && !window.getSelection()?.toString().trim()}>
                <Sparkles className="h-4 w-4" /> Save highlight
              </Button>
            </div>
            {savedHighlights.length > 0 && activeHighlight && (
              <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-soft">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">Highlight review session</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{activeHighlight.prompt}</p>
                  </div>
                  <Badge variant={activeHighlight.status === "mastered" ? "secondary" : "default"}>{activeHighlight.status}</Badge>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-lg bg-card p-2">Due: <span className="font-semibold text-foreground">{formatReviewDate(activeHighlight.next_review_at)}</span></div>
                  <div className="rounded-lg bg-card p-2">Skill: <span className="font-semibold text-foreground">{activeHighlight.skill}</span></div>
                  <div className="rounded-lg bg-card p-2">Reviews: <span className="font-semibold text-foreground">{activeHighlight.review_count}</span></div>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Session: read it aloud, explain the meaning, then make one IELTS sentence with it.</p>
                <Button className="mt-3 w-full" onClick={() => coach.reviewMistake(activeHighlight)}>
                  <Repeat2 className="h-4 w-4" /> Review again session
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {histories.isLoading || coach.isCoachLoading ? (
                <p className="text-sm text-muted-foreground">Loading your saved review list...</p>
              ) : coach.mistakes.length ? (
                coach.mistakes.slice(0, 5).map((item) => {
                  const due = new Date(item.next_review_at) <= new Date() && item.status !== "mastered";
                  return (
                  <div key={item.id} className={`rounded-xl border p-3 ${due ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.skill}</Badge>
                      <Badge variant={item.status === "mastered" ? "secondary" : "default"}>{item.status}</Badge>
                      {due && <Badge variant="destructive">Due now</Badge>}
                      {item.source_type === "manual_highlight" && <Badge variant="secondary">Highlight</Badge>}
                      <span className="text-xs text-muted-foreground">Reviewed {item.review_count}x</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.prompt}</p>
                    <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div className="rounded-lg bg-secondary/70 p-2">Due date: <span className="font-semibold text-foreground">{formatReviewDate(item.next_review_at)}</span></div>
                      <div className="rounded-lg bg-secondary/70 p-2">Status: <span className="font-semibold text-foreground">{item.status}</span></div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Your answer: {item.user_answer || "—"}</p>
                    <p className="text-xs text-muted-foreground">Correct: {item.correct_answer || "—"}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.explanation}</p>
                    <Button variant={item.source_type === "manual_highlight" ? "default" : "outline"} size="sm" className="mt-3 w-full" onClick={() => item.source_type === "manual_highlight" ? setActiveHighlightId(item.id) : coach.reviewMistake(item)}>
                      <Repeat2 className="h-4 w-4" /> {item.source_type === "manual_highlight" ? "Open review session" : "Review again"}
                    </Button>
                  </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Finish Reading, Listening, Writing, or Speaking practice and mistakes will be saved here automatically.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Vocabulary builder</h2>
            </div>
            <div className="space-y-3">
              {(coach.dueVocabulary.length ? coach.dueVocabulary : coach.vocabulary).slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="secondary">{item.topic}</Badge>
                      <h3 className="mt-2 font-display text-lg font-bold text-foreground">{item.word}</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => speakWord(item.word)}>
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.definition}</p>
                  <p className="mt-2 text-xs italic leading-5 text-muted-foreground">“{item.example_sentence}”</p>
                  <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
                    Quiz: {item.quiz_prompt}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => coach.reviewVocabulary(item, false)}>Again</Button>
                    <Button size="sm" onClick={() => coach.reviewVocabulary(item, true)}>I know it</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Band roadmap</h2>
            </div>
            <div className="mb-4 grid gap-3 md:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-xl border border-border bg-secondary/50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Progress calendar</p>
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => (
                    <div key={day.key} className="text-center">
                      <div className={`mx-auto h-8 w-8 rounded-full border text-xs font-bold leading-8 ${day.active ? "border-success bg-success text-success-foreground" : "border-border bg-card text-muted-foreground"}`}>{day.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><SearchCheck className="h-4 w-4 text-accent" /> Automatic weak-skill drill</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{coach.weakSkill}: {weakSkillTask?.title ?? "Start focused practice"}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{weakSkillTask?.detail ?? "Complete one task so your coach can update the next drill."}</p>
                <Button size="sm" className="mt-3" onClick={() => weakSkillTask ? startTask(weakSkillTask) : onSelectModule(coach.weakSkill.toLowerCase() as "writing" | "speaking" | "reading" | "listening")}>
                  Start drill <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {coach.skillScores.map((skill) => {
                const score = Number(skill.score ?? 0);
                const gap = Math.max(0, coach.targetBand - score);
                const Icon = moduleIcons[skill.name];
                return (
                  <button key={skill.name} onClick={() => onSelectModule(skill.name.toLowerCase() as "writing" | "speaking" | "reading" | "listening")} className={`rounded-xl border p-4 text-left transition-all hover:border-primary/30 hover:bg-secondary/60 ${skill.name === coach.weakSkill ? "border-accent/40 bg-accent/10 shadow-soft" : "border-border"}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-foreground"><Icon className="h-4 w-4 text-primary" /> {skill.name}</div>
                      <Badge variant={skill.name === coach.weakSkill ? "default" : "outline"}>{score ? `Gap ${gap.toFixed(1)}` : "Start"}</Badge>
                    </div>
                    <Progress value={score ? Math.min(100, (score / coach.targetBand) * 100) : 6} className="h-2" />
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {score ? `To reach Band ${coach.targetBand}.0, focus on one measurable weakness and review mistakes after each practice.` : "Complete one practice test so the coach can calculate your roadmap."}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}