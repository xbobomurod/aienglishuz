import { ArrowLeft, BookOpenCheck, CalendarDays, CheckCircle2, ChevronRight, Compass, Headphones, Mic, PenLine, Sparkles, Target, Trophy, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEvaluationHistory } from "@/hooks/useEvaluationHistory";

interface LearningModuleProps {
  onBack: () => void;
  onSelectModule: (module: "writing" | "speaking" | "reading" | "listening" | "mocktest") => void;
}

const targetBand = 8;

const vocabTopics = [
  { topic: "Education", words: ["curriculum", "assessment", "literacy", "discipline"] },
  { topic: "Environment", words: ["sustainable", "emissions", "conservation", "scarcity"] },
  { topic: "Technology", words: ["automation", "privacy", "innovation", "reliability"] },
];

export function LearningModule({ onBack, onSelectModule }: LearningModuleProps) {
  const { writingHistory, speakingHistory, readingHistory, listeningHistory, isLoading } = useEvaluationHistory();

  const skills = [
    { name: "Reading", module: "reading" as const, icon: BookOpenCheck, score: readingHistory[0]?.band_score, metric: readingHistory[0] ? `${readingHistory[0].correct_count}/${readingHistory[0].total_questions}` : "No test", task: "Practice 1 passage and review answers by paragraph evidence." },
    { name: "Listening", module: "listening" as const, icon: Headphones, score: listeningHistory[0]?.band_score, metric: listeningHistory[0] ? `${listeningHistory[0].correct_count}/${listeningHistory[0].total_questions}` : "No test", task: "Complete 1 section and replay missed names, dates, numbers." },
    { name: "Writing", module: "writing" as const, icon: PenLine, score: writingHistory[0]?.band_score, metric: writingHistory[0] ? `Band ${writingHistory[0].band_score}` : "No essay", task: "Write one Task 2 paragraph, then improve grammar and linking." },
    { name: "Speaking", module: "speaking" as const, icon: Mic, score: speakingHistory[0]?.band_score, metric: speakingHistory[0] ? `Band ${speakingHistory[0].band_score}` : "No record", task: "Record Part 2 once, repeat with stronger fluency and examples." },
  ];

  const completedSkills = skills.filter((skill) => skill.score);
  const average = completedSkills.reduce((sum, skill) => sum + Number(skill.score), 0) / Math.max(1, completedSkills.length);
  const weakest = [...completedSkills].sort((a, b) => Number(a.score) - Number(b.score))[0] || skills[0];
  const progress = Math.min(100, Math.round((average / targetBand) * 100));
  const automaticPlan = [weakest, ...skills.filter((skill) => skill.name !== weakest.name)].slice(0, 4);

  const mistakes = [
    ...readingHistory.slice(0, 2).map((item) => ({ skill: "Reading", title: item.passage_topic || "Reading practice", detail: `${item.correct_count}/${item.total_questions} correct`, fix: "Find the exact sentence that proves the answer." })),
    ...listeningHistory.slice(0, 2).map((item) => ({ skill: "Listening", title: item.audio_topic || "Listening practice", detail: `${item.correct_count}/${item.total_questions} correct`, fix: "Replay the missed part and write the keyword." })),
    ...writingHistory.slice(0, 2).map((item) => ({ skill: "Writing", title: item.topic || "Writing task", detail: `Band ${item.band_score}`, fix: item.overall_feedback || "Rewrite the weakest paragraph." })),
    ...speakingHistory.slice(0, 2).map((item) => ({ skill: "Speaking", title: item.topic || "Speaking task", detail: `Band ${item.band_score}`, fix: item.daily_practice_tip || "Repeat the answer with fewer pauses." })),
  ].slice(0, 5);

  return (
    <div className="animate-fade-in space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="p-5 md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
              <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> Automatic IELTS Coach</Badge>
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">Today’s smart IELTS study plan is ready</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">The page reads your latest scores, finds the weakest skill, and builds a daily plan for Reading, Listening, Writing, Speaking, mistakes, vocabulary, and band growth.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-primary/10 p-4"><Target className="mb-2 h-5 w-5 text-primary" /><p className="text-xs text-muted-foreground">Target</p><p className="font-bold text-foreground">Band {targetBand}.0</p></div>
              <div className="rounded-xl bg-secondary p-4"><Compass className="mb-2 h-5 w-5 text-primary" /><p className="text-xs text-muted-foreground">Auto focus</p><p className="font-bold text-foreground">{weakest.name}</p></div>
              <div className="rounded-xl bg-accent/10 p-4"><Trophy className="mb-2 h-5 w-5 text-accent" /><p className="text-xs text-muted-foreground">Average</p><p className="font-bold text-foreground">{average ? average.toFixed(1) : "Start"}</p></div>
            </div>
          </div>
          <div className="border-t border-border bg-secondary/40 p-5 md:p-7 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center justify-between"><span className="font-semibold text-foreground">Road to Band {targetBand}.0</span><span className="text-sm text-muted-foreground">{progress}%</span></div>
            <Progress value={progress} className="h-2" />
            <div className="mt-6 space-y-3">
              {skills.map((skill) => <div key={skill.name} className="flex items-center justify-between rounded-xl bg-card p-3"><div className="flex items-center gap-3"><skill.icon className="h-4 w-4 text-primary" /><span className="font-medium">{skill.name}</span></div><Badge variant="outline">{skill.score ? `Band ${skill.score}` : "Start"}</Badge></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-bold">Automatic daily plan</h2></div>
            <div className="space-y-3">
              {automaticPlan.map((item, index) => <button key={item.name} onClick={() => onSelectModule(item.module)} className="group flex w-full items-center gap-4 rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-foreground">{item.name}</span><Badge variant="secondary">{item.metric}</Badge></div><p className="mt-1 text-sm leading-5 text-muted-foreground">{item.task}</p></div><ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" /></button>)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-bold">Mistake notebook</h2></div>
            <div className="space-y-3">
              {isLoading ? <p className="text-sm text-muted-foreground">Loading your practice history...</p> : mistakes.length ? mistakes.map((item, index) => <div key={index} className="rounded-xl border border-border p-3"><div className="mb-1 flex flex-wrap items-center gap-2"><Badge variant="outline">{item.skill}</Badge><span className="text-sm font-semibold">{item.detail}</span></div><p className="text-sm font-medium text-foreground">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.fix}</p></div>) : <p className="text-sm text-muted-foreground">Finish a practice test and your weak answers will appear here automatically.</p>}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {vocabTopics.map((topic) => <Card key={topic.topic}><CardContent className="p-5"><div className="mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><h3 className="font-semibold text-foreground">{topic.topic}</h3></div><div className="flex flex-wrap gap-2">{topic.words.map((word) => <Badge key={word} variant="secondary">{word}</Badge>)}</div><p className="mt-4 text-xs leading-5 text-muted-foreground">Use two words in today’s answer to build IELTS topic range.</p></CardContent></Card>)}
      </section>
    </div>
  );
}