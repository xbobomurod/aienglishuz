import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, PenTool, AlertCircle, Sparkles } from "lucide-react";
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

export function MockWritingSection({ onComplete, isPaused }: MockWritingSectionProps) {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<TaskPrompt | null>(null);
  const [task1Essay, setTask1Essay] = useState("");
  const [task2Essay, setTask2Essay] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("task1");

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
        task1: task1Res.data?.prompt || "Write a letter to your landlord explaining a problem with your apartment.",
        task2: task2Res.data?.prompt || "Some people believe that technology is making us more isolated. To what extent do you agree or disagree?"
      });
    } catch (err) {
      console.error("Error generating prompts:", err);
      setPrompts({
        task1: "Write a letter to your landlord explaining a problem with your apartment and requesting a repair.",
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
      // Score Task 1
      const task1Score = await scoreEssay(task1Essay, prompts.task1, "task1");
      
      // Score Task 2
      const task2Score = await scoreEssay(task2Essay, prompts.task2, "task2");
      
      // Calculate weighted average (Task 2 is worth more)
      const overallBand = (task1Score * 0.33 + task2Score * 0.67);
      const roundedBand = Math.round(overallBand * 2) / 2;

      toast.success(`Writing completed! Task 1: ${task1Score} | Task 2: ${task2Score} | Overall: ${roundedBand}`);
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
    if (!essay.trim()) return 4.0; // Minimum score for empty submission

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Generating your writing prompts...</p>
        </CardContent>
      </Card>
    );
  }

  if (!prompts) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-destructive">Failed to load writing prompts.</p>
          <Button onClick={generatePrompts} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const task1Words = getWordCount(task1Essay);
  const task2Words = getWordCount(task2Essay);
  const canSubmit = task1Words >= 100 || task2Words >= 150;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="w-5 h-5 text-primary" />
          IELTS Writing Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="task1" className="gap-2">
              Task 1
              <Badge variant={task1Words >= 150 ? "default" : "secondary"} className="ml-1">
                {task1Words}/150
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="task2" className="gap-2">
              Task 2
              <Badge variant={task2Words >= 250 ? "default" : "secondary"} className="ml-1">
                {task2Words}/250
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="task1" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Task 1 Prompt</span>
              </div>
              <p className="text-sm text-muted-foreground">{prompts.task1}</p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Letter/Report</span>
                <span className={`text-sm ${task1Words >= 150 ? "text-success" : "text-muted-foreground"}`}>
                  {task1Words} words {task1Words >= 150 && <CheckCircle2 className="w-4 h-4 inline ml-1" />}
                </span>
              </div>
              <Textarea
                placeholder="Write your Task 1 response here... (minimum 150 words)"
                value={task1Essay}
                onChange={(e) => setTask1Essay(e.target.value)}
                className="min-h-[300px] resize-none"
                disabled={isPaused}
              />
              {task1Words > 0 && task1Words < 150 && (
                <div className="flex items-start gap-2 p-3 mt-2 rounded-lg bg-accent/10 text-accent text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>Task 1 requires at least 150 words. You need {150 - task1Words} more.</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="task2" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="font-medium text-sm">Task 2 Prompt</span>
              </div>
              <p className="text-sm text-muted-foreground">{prompts.task2}</p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Essay</span>
                <span className={`text-sm ${task2Words >= 250 ? "text-success" : "text-muted-foreground"}`}>
                  {task2Words} words {task2Words >= 250 && <CheckCircle2 className="w-4 h-4 inline ml-1" />}
                </span>
              </div>
              <Textarea
                placeholder="Write your Task 2 essay here... (minimum 250 words)"
                value={task2Essay}
                onChange={(e) => setTask2Essay(e.target.value)}
                className="min-h-[300px] resize-none"
                disabled={isPaused}
              />
              {task2Words > 0 && task2Words < 250 && (
                <div className="flex items-start gap-2 p-3 mt-2 rounded-lg bg-accent/10 text-accent text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>Task 2 requires at least 250 words. You need {250 - task2Words} more.</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Button 
          onClick={submitWriting} 
          disabled={isSubmitting || isPaused || !canSubmit}
          className="w-full gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Grading your essays...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Submit Writing (Task 1: {task1Words}w | Task 2: {task2Words}w)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
