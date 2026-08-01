import { useEffect, useState, useRef } from "react";
import { Send, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScoreDisplay } from "./ScoreDisplay";
import { CorrectionTable } from "./CorrectionTable";
import { ModelAnswer } from "./ModelAnswer";
import { ProgressReport } from "./ProgressReport";
import { TaskSelector, WritingTaskType } from "./TaskSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { useEvaluationHistory } from "@/hooks/useEvaluationHistory";
import { useTestSession } from "@/hooks/useTestSession";
import { TestSessionControls } from "@/components/TestSessionControls";
import { ExamTimerBar } from "@/components/ExamTimerBar";
import { toast } from "sonner";

interface WritingModuleProps {
  onBack: () => void;
}

interface WritingFeedback {
  bandScore: number;
  breakdown: {
    taskResponse?: number;
    taskAchievement?: number;
    coherence: number;
    lexicalResource: number;
    grammar: number;
  };
  errors: Array<{
    mistake: string;
    correction: string;
    tip?: string;
    logic?: string;
  }>;
  suggestions: string[];
  overallFeedback: string;
  modelAnswer?: string;
}

const getMinWordCount = (taskType: WritingTaskType) => {
  switch (taskType) {
    case "task1": return 150;
    case "task2": return 250;
  }
};

const isTask1 = (taskType: WritingTaskType) => taskType === "task1";

const getTaskLabel = (taskType: WritingTaskType) => {
  switch (taskType) {
    case "task1": return "Task 1 Report";
    case "task2": return "Essay";
  }
};

export function WritingModule({ onBack }: WritingModuleProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { saveSession, loadSession } = useTestSession("writing");
  const [taskType, setTaskType] = useState<WritingTaskType>("task2");
  const [topic, setTopic] = useState("");
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [essay, setEssay] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const startRef = useRef<number>(Date.now());

  const DRAFT_KEY = `writing-draft-${taskType}`;
  const RECOMMENDED = taskType === "task1" ? 20 : 40;

  // Load draft on task change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.essay) setEssay(parsed.essay);
        if (parsed.topic && !topic) setTopic(parsed.topic);
      } else {
        setEssay("");
      }
    } catch { /* noop */ }
    startRef.current = Date.now();
    setElapsed(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskType]);

  // Elapsed timer
  useEffect(() => {
    if (feedback) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [feedback]);

  // Debounced auto-save
  useEffect(() => {
    if (!essay && !topic) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ essay, topic }));
        setSavedAt(new Date());
      } catch { /* noop */ }
    }, 800);
    return () => clearTimeout(t);
  }, [essay, topic, DRAFT_KEY]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  
  const { 
    saveWritingEvaluation, 
    getPreviousWritingScore,
    writingHistory 
  } = useEvaluationHistory();

  const minWordCount = getMinWordCount(taskType);

  const loadTestById = (id: string) => {
    setSearchParams({ test: id });
  };

  useEffect(() => {
    const id = searchParams.get("test");
    if (!id || testSessionId === id) return;

    loadSession<{ taskType: WritingTaskType; topic: string }>(id)
      .then((session) => {
        if (!session) return;
        setTaskType(session.content.taskType);
        setTopic(session.content.topic);
        setTestSessionId(session.id);
      })
      .catch(() => toast.error("Could not load this writing test ID."));
  }, [loadSession, searchParams, testSessionId]);

  const handleGeneratePrompt = async () => {
    setIsGeneratingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('grade-essay', {
        body: { generatePrompt: true, taskType }
      });

      if (error || data.error) {
        toast.error("Failed to generate prompt");
        return;
      }

      setTopic(data.prompt);
      const session = await saveSession({
        variant: taskType,
        title: data.prompt.slice(0, 80),
        content: { taskType, topic: data.prompt },
      });
      if (session) {
        setTestSessionId(session.id);
        setSearchParams({ test: session.id });
      }
      toast.success("New prompt generated and saved with an ID!");
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleSubmit = async () => {
    if (!essay.trim()) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('grade-essay', {
        body: { essay, topic: topic || undefined, taskType }
      });

      if (error) {
        console.error("Error grading essay:", error);
        toast.error("Failed to grade essay. Please try again.");
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setFeedback(data);
      
      const { error: saveError } = await saveWritingEvaluation({
        topic: topic || undefined,
        essay,
        bandScore: data.bandScore,
        breakdown: {
          taskResponse: data.breakdown.taskResponse || data.breakdown.taskAchievement || 0,
          coherence: data.breakdown.coherence,
          lexicalResource: data.breakdown.lexicalResource,
          grammar: data.breakdown.grammar
        },
        errors: data.errors,
        suggestions: data.suggestions,
        overallFeedback: data.overallFeedback
      });

      if (saveError) {
        toast.success(`Graded! IELTS Band: ${data.bandScore}`);
      } else {
        setSavedTaskId(crypto.randomUUID());
        toast.success(`Graded and saved! IELTS Band: ${data.bandScore}`);
      }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;
  const paragraphCount = essay.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  const previousScore = getPreviousWritingScore();

  const getImprovementAreas = (): string[] => {
    if (!feedback || writingHistory.length < 1) return [];
    const areas: string[] = [];
    const prev = writingHistory[0];
    
    if (prev) {
      const taskScore = feedback.breakdown.taskResponse || feedback.breakdown.taskAchievement || 0;
      if (taskScore > (prev.task_response || 0)) {
        areas.push("Your task response improved!");
      }
      if (feedback.breakdown.coherence > (prev.coherence || 0)) {
        areas.push("Better coherence and cohesion.");
      }
      if (feedback.breakdown.lexicalResource > (prev.lexical_resource || 0)) {
        areas.push("More sophisticated vocabulary.");
      }
      if (feedback.breakdown.grammar > (prev.grammar || 0)) {
        areas.push("Grammar accuracy improved.");
      }
      if (areas.length === 0) {
        areas.push("Consistent performance maintained.");
      }
    }
    return areas;
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">
            Writing Examiner
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm truncate">
            Official IELTS band scoring with model answers
          </p>
        </div>
      </div>

      <TestSessionControls testId={testSessionId} title={topic} onLoad={loadTestById} />

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Input Section */}
        <div className="space-y-3 sm:space-y-4">
          {/* Task Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Task Type
            </label>
            <TaskSelector
              type="writing"
              selectedTask={taskType}
              onSelectTask={setTaskType}
            />
          </div>

          {/* Topic */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                {isTask1(taskType) ? "Academic Task 1 Visual Prompt" : "Task 2 Essay Topic"}
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePrompt}
                disabled={isGeneratingPrompt}
              >
                {isGeneratingPrompt ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                <span className="hidden sm:inline">Generate</span>
              </Button>
            </div>
            <Textarea
              placeholder={isTask1(taskType) 
                ? "Click 'Generate' for a graph, chart, map, table, diagram or process task..."
                : "Click 'Generate' for a topic, or enter your own essay question..."
              }
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-card min-h-[60px] sm:min-h-[80px] resize-none text-sm"
            />
          </div>
          
          {/* Essay Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Your {getTaskLabel(taskType)}
            </label>
            <ExamTimerBar
              className="mb-2"
              seconds={elapsed}
              target={RECOMMENDED * 60}
              mode="up"
              label={getTaskLabel(taskType)}
              meta={
                <>
                  <span>{paragraphCount} ¶</span>
                  <span className={wordCount < minWordCount ? "text-muted-foreground" : "text-success"}>
                    {wordCount}/{minWordCount}+
                    {wordCount >= minWordCount && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
                  </span>
                </>
              }
            />
            <Textarea
              placeholder={`Write your ${getTaskLabel(taskType).toLowerCase()} here... (minimum ${minWordCount} words)`}
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              className="min-h-[180px] sm:min-h-[250px] bg-card resize-none text-sm"
            />
            {savedAt && (
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <Save className="w-3 h-3" /> Draft saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={!essay.trim() || isLoading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Evaluate {getTaskLabel(taskType)}
              </>
            )}
          </Button>

          {wordCount > 0 && wordCount < minWordCount && (
            <div className="flex items-start gap-2 p-2 sm:p-3 rounded-lg bg-accent/10 text-accent text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{getTaskLabel(taskType)} requires at least {minWordCount} words. You have {minWordCount - wordCount} more to go.</span>
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className="space-y-3 sm:space-y-4">
          {feedback ? (
            <>
              {/* Progress Report */}
              {savedTaskId && (
                <ProgressReport
                  currentScore={feedback.bandScore}
                  previousScore={previousScore}
                  taskId={savedTaskId}
                  improvementAreas={getImprovementAreas()}
                  type="writing"
                />
              )}

              {/* Score Display */}
              <Card>
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg">📝 Overall Band Score</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
                    <ScoreDisplay score={feedback.bandScore} label="IELTS Band" size="lg" />
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <ScoreDisplay 
                        score={feedback.breakdown.taskResponse || feedback.breakdown.taskAchievement || 0} 
                        label={isTask1(taskType) ? "Task" : "Response"} 
                        size="sm" 
                      />
                      <ScoreDisplay score={feedback.breakdown.coherence} label="Coherence" size="sm" />
                      <ScoreDisplay score={feedback.breakdown.lexicalResource} label="Lexical" size="sm" />
                      <ScoreDisplay score={feedback.breakdown.grammar} label="Grammar" size="sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Feedback */}
              <Card>
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg">💬 Feedback</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <p className="text-muted-foreground text-sm">{feedback.overallFeedback}</p>
                </CardContent>
              </Card>

              {/* Correction Table */}
              <CorrectionTable items={feedback.errors} />

              {/* Suggestions */}
              <Card>
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg">🚀 Grade-Up Suggestions</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <ul className="space-y-2">
                    {feedback.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-success/10 text-success flex items-center justify-center flex-shrink-0 text-[10px] sm:text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Model Answer */}
              {feedback.modelAnswer && (
                <ModelAnswer answer={feedback.modelAnswer} level="Band 8+" />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px] sm:min-h-[400px] rounded-xl border border-dashed border-border bg-secondary/30">
              <div className="text-center text-muted-foreground p-4">
                <PenIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Submit your {getTaskLabel(taskType).toLowerCase()} to see detailed feedback</p>
                <p className="text-xs mt-2">Includes IELTS band breakdown and a model answer</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}
