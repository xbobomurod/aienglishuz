import { useState } from "react";
import { Send, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScoreDisplay } from "./ScoreDisplay";
import { DualScoreDisplay } from "./DualScoreDisplay";
import { CorrectionTable } from "./CorrectionTable";
import { ModelAnswer } from "./ModelAnswer";
import { ProgressReport } from "./ProgressReport";
import { TaskSelector, WritingTaskType } from "./TaskSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEvaluationHistory } from "@/hooks/useEvaluationHistory";
import { toast } from "sonner";

interface WritingModuleProps {
  onBack: () => void;
}

interface WritingFeedback {
  bandScore: number;
  cefrLevel: string;
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
    cefrTip?: string;
    logic?: string;
  }>;
  suggestions: string[];
  overallFeedback: string;
  modelAnswer?: string;
}

export function WritingModule({ onBack }: WritingModuleProps) {
  const [taskType, setTaskType] = useState<WritingTaskType>("task2");
  const [topic, setTopic] = useState("");
  const [essay, setEssay] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  
  const { 
    saveWritingEvaluation, 
    getPreviousWritingScore,
    writingHistory 
  } = useEvaluationHistory();

  const minWordCount = taskType === "task1" ? 150 : 250;

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
      toast.success("New prompt generated!");
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
        toast.success(`Essay graded! IELTS: ${data.bandScore} | CEFR: ${data.cefrLevel}`);
      } else {
        setSavedTaskId(crypto.randomUUID());
        toast.success(`Essay graded and saved! IELTS: ${data.bandScore} | CEFR: ${data.cefrLevel}`);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Writing Examiner
          </h1>
          <p className="text-muted-foreground text-sm">
            IELTS + CEFR dual scoring with model answers
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
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
                {taskType === "task1" ? "Letter/Email Prompt" : "Essay Topic"}
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
                Generate
              </Button>
            </div>
            <Textarea
              placeholder={taskType === "task1" 
                ? "Click 'Generate' for a prompt, or enter your own letter/email task..."
                : "Click 'Generate' for a topic, or enter your own essay question..."
              }
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-card min-h-[80px] resize-none"
            />
          </div>
          
          {/* Essay Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                Your {taskType === "task1" ? "Letter/Email" : "Essay"}
              </label>
              <span className={`text-sm ${wordCount < minWordCount ? 'text-muted-foreground' : 'text-success'}`}>
                {wordCount} words {wordCount >= minWordCount && <CheckCircle2 className="w-4 h-4 inline ml-1" />}
              </span>
            </div>
            <Textarea
              placeholder={`Write your ${taskType === "task1" ? "letter/email" : "essay"} here... (minimum ${minWordCount} words)`}
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              className="min-h-[250px] bg-card resize-none"
            />
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
                Evaluate {taskType === "task1" ? "Letter" : "Essay"}
              </>
            )}
          </Button>

          {wordCount > 0 && wordCount < minWordCount && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 text-accent text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{taskType === "task1" ? "Task 1" : "Task 2"} requires at least {minWordCount} words. You have {minWordCount - wordCount} more to go.</span>
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className="space-y-4">
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

              {/* Dual Score Display */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">📝 Overall Grade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-around">
                    <DualScoreDisplay 
                      bandScore={feedback.bandScore} 
                      cefrLevel={feedback.cefrLevel} 
                      size="lg" 
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <ScoreDisplay 
                        score={feedback.breakdown.taskResponse || feedback.breakdown.taskAchievement || 0} 
                        label={taskType === "task1" ? "Task" : "Response"} 
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">💬 Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feedback.overallFeedback}</p>
                </CardContent>
              </Card>

              {/* Correction Table */}
              <CorrectionTable items={feedback.errors} />

              {/* Suggestions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">🚀 Grade-Up Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feedback.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center flex-shrink-0 text-xs font-bold">
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
                <ModelAnswer answer={feedback.modelAnswer} level="C1" />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] rounded-xl border border-dashed border-border bg-secondary/30">
              <div className="text-center text-muted-foreground">
                <PenIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Submit your {taskType === "task1" ? "letter" : "essay"} to see detailed feedback</p>
                <p className="text-xs mt-2">Includes IELTS band score, CEFR level, and model answer</p>
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
