import { ArrowLeft, BookMarked, CalendarCheck, CheckCircle2, Compass, Headphones, Lightbulb, Mic, NotebookTabs, PenTool, Target, Trophy, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEvaluationHistory } from "@/hooks/useEvaluationHistory";

interface LearningModuleProps {
  onBack: () => void;
  onSelectModule: (module: "writing" | "speaking" | "reading" | "listening" | "mocktest") => void;
}

const targetBand = 8;

const vocabularySets = [
  { topic: "Education", words: ["curriculum", "assessment", "literacy", "tuition", "discipline"] },
  { topic: "Environment", words: ["sustainable", "emissions", "conservation", "habitat", "scarcity"] },
  { topic: "Technology", words: ["automation", "privacy", "innovation", "interface", "reliability"] },
];

export function LearningModule({ onBack, onSelectModule }: LearningModuleProps) {
  const { writingHistory, speakingHistory, readingHistory, listeningHistory, isLoading } = useEvaluationHistory();

  const latestScores = [
    { skill: "Reading", focus: "Evidence & speed", module: "reading" as const, icon: BookMarked, score: readingHistory[0]?.band_score, task: "Complete one passage and review every evidence quote." },
    { skill: "Listening", focus: "Accuracy & detail", module: "listening" as const, icon: Headphones, score: listeningHistory[0]?.band_score, task: "Do one section, then replay missed moments with transcript hidden." },
    { skill: "Writing", focus: "Coherence & grammar", module: "writing" as const, icon: PenTool, score: writingHistory[0]?.band_score, task: "Write Task 2 and upgrade three weak sentences." },
    { skill: "Speaking", focus: "Fluency & range", module: "speaking" as const, icon: Mic, score: speakingHistory[0]?.band_score, task: "Record Part 2, then repeat with fewer pauses." },
  ];

  const averageScore = latestScores.filter((item) => item.score).reduce((sum, item) => sum + Number(item.score), 0) / Math.max(1, latestScores.filter((item) => item.score).length);
  const weakestSkill = [...latestScores].filter((item) => item.score).sort((a, b) => Number(a.score) - Number(b.score))[0] || latestScores[0];
  const roadmapProgress = Math.min(100, Math.round((averageScore / targetBand) * 100));

  const mistakes = [
    ...readingHistory.slice(0, 2).map((item) => ({ skill: "Reading", label: item.passage_topic || "Reading test", note: `${item.correct_count}/${item.total_questions} correct`, action: "Review wrong answers with passage evidence." })),
    ...listeningHistory.slice(0, 2).map((item) => ({ skill: "Listening", label: item.audio_topic || "Listening test", note: `${item.correct_count}/${item.total_questions} correct`, action: "Replay the section and catch names, numbers, dates." })),
    ...writingHistory.slice(0, 2).map((item) => ({ skill: "Writing", label: item.topic || "Writing task", note: `Band ${item.band_score}`, action: item.overall_feedback || "Rewrite one paragraph with clearer logic." })),
    ...speakingHistory.slice(0, 2).map((item) => ({ skill: "Speaking", label: item.topic || "Speaking task", note: `Band ${item.band_score}`, action: item.daily_practice_tip || "Repeat your answer with stronger fluency." })),
  ].slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="mt-1 shrink-0">
          <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <Badge variant="secondary" className="mb-3 gap-1"><NotebookTabs className="w-3 h-3" /> IELTS study workspace</Badge>
              <h1 className="font-display text-3xl font-bold leading-tight text-foreground">IELTS Learning Hub</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A focused study desk for daily practice, mistakes, topic vocabulary, and your route to the next band.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-primary/10 px-4 py-3 text-primary">
            <Target className="h-4 w-4" />
            <span className="text-sm font-semibold">Target Band {targetBand}.0</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {latestScores.map((item) => (
          <Card key={item.skill} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary"><item.icon className="w-5 h-5" /></div>
                <Badge variant="secondary">{item.score ? `Band ${item.score}` : "Start"}</Badge>
              </div>
              <p className="font-semibold text-foreground">{item.skill}</p>
              <p className="mt-1 text-xs font-medium uppercase text-primary">{item.focus}</p>
              <p className="text-sm leading-5 text-muted-foreground mt-3">{item.task}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="plan" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 md:grid-cols-4">
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="mistakes">Mistakes</TabsTrigger>
          <TabsTrigger value="vocab">Vocabulary</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="plan">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-primary" />Today’s Study Plan</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {latestScores.map((item, index) => (
                <button key={item.skill} onClick={() => onSelectModule(item.module)} className="text-left rounded-lg border border-border bg-secondary/30 p-4 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-2 mb-2"><Badge>{index + 1}</Badge><span className="font-semibold">{item.skill}</span></div>
                  <p className="text-sm text-muted-foreground">{item.task}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mistakes">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="w-5 h-5 text-primary" />Mistake Notebook</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? <p className="text-sm text-muted-foreground">Loading your recent practice...</p> : mistakes.length ? mistakes.map((item, index) => (
                <div key={index} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2"><Badge variant="outline">{item.skill}</Badge><span className="font-medium">{item.label}</span><span className="text-sm text-muted-foreground">{item.note}</span></div>
                  <p className="text-sm text-muted-foreground">{item.action}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">Complete a test to start building your mistake notebook.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vocab">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" />IELTS Vocabulary Builder</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {vocabularySets.map((set) => (
                <div key={set.topic} className="rounded-lg border border-border p-4">
                  <p className="font-semibold mb-3">{set.topic}</p>
                  <div className="flex flex-wrap gap-2">{set.words.map((word) => <Badge key={word} variant="secondary">{word}</Badge>)}</div>
                  <p className="text-xs text-muted-foreground mt-3">Use two words in a Speaking answer or Writing paragraph today.</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roadmap">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Compass className="w-5 h-5 text-primary" />Band Roadmap</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2"><span className="font-medium">Progress to Band {targetBand}.0</span><span className="text-sm text-muted-foreground">{averageScore ? averageScore.toFixed(1) : "No score yet"}</span></div>
                <Progress value={roadmapProgress} className="h-2" />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-primary/10 p-4"><Trophy className="w-5 h-5 text-primary mb-2" /><p className="font-semibold">Next focus</p><p className="text-sm text-muted-foreground">{weakestSkill.skill}: {weakestSkill.task}</p></div>
                <div className="rounded-lg bg-secondary p-4"><CheckCircle2 className="w-5 h-5 text-primary mb-2" /><p className="font-semibold">Weekly rule</p><p className="text-sm text-muted-foreground">2 tests + 2 reviews + 1 full mock every week.</p></div>
                <div className="rounded-lg bg-accent/10 p-4"><Target className="w-5 h-5 text-accent mb-2" /><p className="font-semibold">Band jump</p><p className="text-sm text-muted-foreground">Fix repeated mistakes before adding harder tests.</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}