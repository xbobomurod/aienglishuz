import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, PenTool, AlertCircle, Sparkles, Mail, Briefcase, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MockWritingSectionProps {
  onComplete: (bandScore: number) => void;
  isPaused: boolean;
}

interface TaskPrompt {
  task1Informal: string;
  task1Formal: string;
  task2: string;
}

type TaskTab = "task1-informal" | "task1-formal" | "task2";

const taskConfig = {
  "task1-informal": { minWords: 50, label: "Informal Letter", icon: Mail },
  "task1-formal": { minWords: 120, label: "Formal Letter", icon: Briefcase },
  "task2": { minWords: 250, label: "Essay", icon: FileText },
};

export function MockWritingSection({ onComplete, isPaused }: MockWritingSectionProps) {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<TaskPrompt | null>(null);
  const [essays, setEssays] = useState({
    "task1-informal": "",
    "task1-formal": "",
    "task2": ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskTab>("task1-informal");

  useEffect(() => {
    generatePrompts();
  }, []);

  const generatePrompts = async () => {
    try {
      const [informalRes, formalRes, task2Res] = await Promise.all([
        supabase.functions.invoke('grade-essay', {
          body: { generatePrompt: true, taskType: 'task1', isInformal: true }
        }),
        supabase.functions.invoke('grade-essay', {
          body: { generatePrompt: true, taskType: 'task1', isInformal: false }
        }),
        supabase.functions.invoke('grade-essay', {
          body: { generatePrompt: true, taskType: 'task2' }
        })
      ]);

      setPrompts({
        task1Informal: informalRes.data?.prompt || "Write an email to a friend inviting them to visit you.",
        task1Formal: formalRes.data?.prompt || "Write a formal letter to your landlord about a maintenance issue.",
        task2: task2Res.data?.prompt || "Some people believe that technology is making us more isolated. To what extent do you agree or disagree?"
      });
    } catch (err) {
      console.error("Error generating prompts:", err);
      setPrompts({
        task1Informal: "Write an email to a friend inviting them to visit you.",
        task1Formal: "Write a formal letter to your landlord explaining a problem with your apartment.",
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
      // Score all tasks
      const [informalScore, formalScore, task2Score] = await Promise.all([
        scoreEssay(essays["task1-informal"], prompts.task1Informal, "task1", true),
        scoreEssay(essays["task1-formal"], prompts.task1Formal, "task1", false),
        scoreEssay(essays["task2"], prompts.task2, "task2", false)
      ]);
      
      // Calculate weighted average (Task 2 is worth 50%, Task 1 combined is 50%)
      const task1Combined = (informalScore + formalScore) / 2;
      const overallBand = (task1Combined * 0.5 + task2Score * 0.5);
      const roundedBand = Math.round(overallBand * 2) / 2;

      toast.success(`Writing completed! Informal: ${informalScore} | Formal: ${formalScore} | Essay: ${task2Score} | Overall: ${roundedBand}`);
      onComplete(roundedBand);
    } catch (err) {
      console.error("Error submitting writing:", err);
      toast.error("Failed to submit writing.");
      onComplete(5.0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scoreEssay = async (essay: string, topic: string, taskType: string, isInformal: boolean): Promise<number> => {
    const minWords = taskType === "task1" ? (isInformal ? 50 : 120) : 250;
    if (!essay.trim() || essay.trim().split(/\s+/).length < minWords * 0.5) return 4.0;

    try {
      const { data, error } = await supabase.functions.invoke('grade-essay', {
        body: { essay, topic, taskType, isInformal }
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
    "task1-informal": getCompletionStatus("task1-informal"),
    "task1-formal": getCompletionStatus("task1-formal"),
    "task2": getCompletionStatus("task2")
  };

  const canSubmit = allStatus["task1-informal"].count >= 25 || 
                    allStatus["task1-formal"].count >= 60 || 
                    allStatus["task2"].count >= 150;

  const renderTaskTab = (tab: TaskTab, prompt: string) => {
    const { count, min, complete } = allStatus[tab];
    const config = taskConfig[tab];
    const Icon = config.icon;
    
    return (
      <TabsContent value={tab} className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
        <div className="p-3 sm:p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 text-primary" />
            <span className="font-medium text-xs sm:text-sm">{config.label} Prompt</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">{prompt}</p>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium">Your Response</span>
            <span className={`text-xs sm:text-sm ${complete ? "text-success" : "text-muted-foreground"}`}>
              {count}/{min}+ {complete && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 inline ml-1" />}
            </span>
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
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <PenTool className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          IELTS Writing Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaskTab)}>
          <TabsList className="grid w-full grid-cols-3 h-auto">
            {(["task1-informal", "task1-formal", "task2"] as TaskTab[]).map((tab) => {
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
                    <span className="sm:hidden">{tab === "task2" ? "Essay" : tab.includes("informal") ? "Inf." : "Form."}</span>
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

          {renderTaskTab("task1-informal", prompts.task1Informal)}
          {renderTaskTab("task1-formal", prompts.task1Formal)}
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
