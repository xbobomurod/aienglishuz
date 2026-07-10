import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, PenTool, AlertCircle, BarChart3, FileText, Clock, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MockWritingSectionProps {
  onComplete: (bandScore: number) => void;
  isPaused: boolean;
}

interface TaskPrompt {
  task1: string;
  task2: string;
}

type TaskTab = "task1" | "task2";

const taskConfig = {
  "task1": { minWords: 150, label: "Task 1: Academic Report", icon: BarChart3, recommendedMin: 20 },
  "task2": { minWords: 250, label: "Task 2: Essay", icon: FileText, recommendedMin: 40 },
};

const DRAFT_STORAGE_KEY = "mock-writing-draft-v1";

export function MockWritingSection({ onComplete, isPaused }: MockWritingSectionProps) {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<TaskPrompt | null>(null);
  const [essays, setEssays] = useState<Record<TaskTab, string>>({
    "task1": "",
    "task2": ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskTab>("task1");
  const [elapsed, setElapsed] = useState<Record<TaskTab, number>>({ task1: 0, task2: 0 });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const tickRef = useRef<number | null>(null);

  // Load drafts on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.essays) setEssays(parsed.essays);
        if (parsed?.elapsed) setElapsed(parsed.elapsed);
      }
    } catch { /* ignore */ }
  }, []);

  // Autosave drafts every 5s when content changes
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ essays, elapsed }));
        setSavedAt(new Date());
      } catch { /* quota */ }
    }, 800);
    return () => window.clearTimeout(t);
  }, [essays, elapsed]);

  // Per-task elapsed timer (only for active tab, and not while paused / submitting)
  useEffect(() => {
    if (isPaused || isSubmitting || isLoading) return;
    tickRef.current = window.setInterval(() => {
      setElapsed((e) => ({ ...e, [activeTab]: e[activeTab] + 1 }));
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [activeTab, isPaused, isSubmitting, isLoading]);

  useEffect(() => {
    generatePrompts();
  }, []);

  const generatePrompts = async () => {
    try {
      const [task1Res, task2Res] = await Promise.all([
        supabase.functions.invoke('grade-essay', {
          body: { generatePrompt: true, taskType: 'task1' }
        }),
        supabase.functions.invoke('grade-essay', {
          body: { generatePrompt: true, taskType: 'task2' }
        })
      ]);

      setPrompts({
        task1: task1Res.data?.prompt || "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features.",
        task2: task2Res.data?.prompt || "Some people believe that technology is making us more isolated. To what extent do you agree or disagree?"
      });
    } catch (err) {
      console.error("Error generating prompts:", err);
      setPrompts({
        task1: "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the main features.",
        task2: "Some people believe that technology is making us more isolated. To what extent do you agree or disagree?"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitWriting = async () => {
    if (!prompts) return;

    setIsSubmitting(true);

    try {
      const [task1Score, task2Score] = await Promise.all([
        scoreEssay(essays["task1"], prompts.task1, "task1"),
        scoreEssay(essays["task2"], prompts.task2, "task2")
      ]);

      // IELTS Writing: Task 2 weighted 2x, Task 1 weighted 1x
      const overallBand = (task1Score * 1 + task2Score * 2) / 3;
      const roundedBand = Math.round(overallBand * 2) / 2;

      toast.success(`Writing complete! Task 1: ${task1Score} • Task 2: ${task2Score} • Overall: ${roundedBand}`);
      try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ignore */ }
      onComplete(roundedBand);
    } catch (err) {
      console.error("Error submitting writing:", err);
      toast.error("Failed to submit writing.");
      onComplete(5.0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scoreEssay = async (essay: string, topic: string, taskType: string): Promise<number> => {
    const minWords = taskType === "task1" ? 150 : 250;
    if (!essay.trim() || essay.trim().split(/\s+/).length < minWords * 0.5) return 4.0;

    try {
      const { data, error } = await supabase.functions.invoke('grade-essay', {
        body: { essay, topic, taskType }
      });

      if (error || data.error) {
        return 5.0;
      }

      // Save to database
      if (user && data.bandScore) {
        await supabase.from("writing_evaluations").insert({
          user_id: user.id,
          topic,
          essay,
          band_score: data.bandScore,
          task_response: data.breakdown?.taskResponse || data.breakdown?.taskAchievement || 0,
          coherence: data.breakdown?.coherence || 0,
          lexical_resource: data.breakdown?.lexicalResource || 0,
          grammar: data.breakdown?.grammar || 0,
          errors: data.errors || [],
          suggestions: data.suggestions || [],
          overall_feedback: data.overallFeedback || ""
        } as any);
      }

      return data.bandScore || 5.0;
    } catch {
      return 5.0;
    }
  };

  const getWordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const getParagraphCount = (text: string) => text.trim().split(/\n\s*\n/).filter(Boolean).length;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 sm:py-16 text-center">
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground text-sm">Generating your writing prompts...</p>
        </CardContent>
      </Card>
    );
  }

  if (!prompts) {
    return (
      <Card>
        <CardContent className="py-12 sm:py-16 text-center">
          <p className="text-destructive">Failed to load writing prompts.</p>
          <Button onClick={generatePrompts} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const getCompletionStatus = (tab: TaskTab) => {
    const count = getWordCount(essays[tab]);
    const min = taskConfig[tab].minWords;
    return { count, min, complete: count >= min };
  };

  const allStatus = {
    "task1": getCompletionStatus("task1"),
    "task2": getCompletionStatus("task2")
  };

  const canSubmit = allStatus["task1"].count >= 75 || allStatus["task2"].count >= 150;

  const renderTaskTab = (tab: TaskTab, prompt: string) => {
    const { count, min, complete } = allStatus[tab];
    const config = taskConfig[tab];
    const Icon = config.icon;
    const spent = elapsed[tab];
    const overTime = spent > config.recommendedMin * 60;
    const paras = getParagraphCount(essays[tab]);
    
    return (
      <TabsContent value={tab} className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
        <div className="p-3 sm:p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <span className="font-medium text-xs sm:text-sm">{config.label} Prompt</span>
            </div>
            <Badge variant={overTime ? "destructive" : "outline"} className="gap-1 text-[10px] sm:text-xs">
              <Clock className="w-3 h-3" />
              {formatTime(spent)} / {config.recommendedMin}:00
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">{prompt}</p>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium">Your Response</span>
            <div className="flex items-center gap-3 text-[11px] sm:text-xs text-muted-foreground">
              <span>{paras} {paras === 1 ? "paragraph" : "paragraphs"}</span>
              <span className={complete ? "text-success" : ""}>
                {count}/{min}+ {complete && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 inline ml-1" />}
              </span>
            </div>
          </div>
          <Textarea
            placeholder={`Write your ${config.label.toLowerCase()} here... (minimum ${min} words)`}
            value={essays[tab]}
            onChange={(e) => setEssays(prev => ({ ...prev, [tab]: e.target.value }))}
            className="min-h-[200px] sm:min-h-[250px] resize-none text-sm"
            disabled={isPaused}
          />
          {count > 0 && count < min && (
            <div className="flex items-start gap-2 p-2 sm:p-3 mt-2 rounded-lg bg-accent/10 text-accent text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{config.label} requires at least {min} words. You need {min - count} more.</span>
            </div>
          )}
        </div>
      </TabsContent>
    );
  };

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <PenTool className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            IELTS Writing Test
          </CardTitle>
          {savedAt && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Save className="w-3 h-3" /> Draft saved {savedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaskTab)}>
          <TabsList className="grid w-full grid-cols-2 h-auto">
            {(["task1", "task2"] as TaskTab[]).map((tab) => {
              const { count, min, complete } = allStatus[tab];
              const config = taskConfig[tab];
              const Icon = config.icon;
              
              return (
                <TabsTrigger 
                  key={tab} 
                  value={tab} 
                  className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-xs"
                >
                  <div className="flex items-center gap-1">
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline truncate">{config.label}</span>
                    <span className="sm:hidden">{tab === "task1" ? "Task 1" : "Task 2"}</span>
                  </div>
                  <Badge 
                    variant={complete ? "default" : "secondary"} 
                    className="text-[10px] px-1 py-0"
                  >
                    {count}/{min}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {renderTaskTab("task1", prompts.task1)}
          {renderTaskTab("task2", prompts.task2)}
        </Tabs>

        <Button 
          onClick={submitWriting} 
          disabled={isSubmitting || isPaused || !canSubmit}
          className="w-full gap-2"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Grading your essays...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">Submit All Tasks</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
