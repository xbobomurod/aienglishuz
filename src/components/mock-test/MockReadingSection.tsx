import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, BookOpen, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MockReadingSectionProps {
  onComplete: (bandScore: number) => void;
  isPaused: boolean;
}

interface Question {
  id: number;
  type: "multiple-choice" | "true-false-not-given" | "fill-blank";
  question: string;
  options?: string[];
  correctAnswer: string;
}

interface ReadingTest {
  topic: string;
  passage: string;
  questions: Question[];
}

export function MockReadingSection({ onComplete, isPaused }: MockReadingSectionProps) {
  const { user } = useAuth();
  const [test, setTest] = useState<ReadingTest | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const [currentPassage, setCurrentPassage] = useState(0);

  useEffect(() => {
    generateTest();
  }, []);

  const generateTest = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("reading-test", {
        body: { action: "generate", difficulty: "full-test" }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setTest(data);
    } catch (err) {
      console.error("Error generating test:", err);
      toast.error("Failed to generate reading test.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitTest = async () => {
    if (!test) return;

    setIsSubmitting(true);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    try {
      const userAnswers = test.questions.map(q => answers[q.id] || "");
      const correctAnswers = test.questions.map(q => q.correctAnswer);

      const { data, error } = await supabase.functions.invoke("reading-test", {
        body: {
          action: "score",
          userAnswers,
          correctAnswers,
          totalQuestions: test.questions.length
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Save to database
      if (user) {
        await supabase.from("reading_evaluations").insert({
          user_id: user.id,
          passage_topic: test.topic,
          passage_text: test.passage,
          questions: test.questions as unknown,
          user_answers: userAnswers as unknown,
          correct_answers: correctAnswers as unknown,
          band_score: data.bandScore,
          correct_count: data.correctCount,
          total_questions: data.totalQuestions,
          time_taken_seconds: timeTaken,
          feedback: data.feedback
        } as any);
      }

      toast.success(`Reading completed! Band Score: ${data.bandScore}`);
      onComplete(data.bandScore);
    } catch (err) {
      console.error("Error submitting test:", err);
      toast.error("Failed to submit test.");
      onComplete(5.0); // Default score on error
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Generating your reading passage...</p>
        </CardContent>
      </Card>
    );
  }

  if (!test) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-destructive">Failed to load the reading test.</p>
          <Button onClick={generateTest} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / test.questions.length) * 100;
  const passageRanges = [
    { label: "Passage 1", start: 0, end: 13 },
    { label: "Passage 2", start: 13, end: 26 },
    { label: "Passage 3", start: 26, end: 40 },
  ];
  const activeRange = passageRanges[currentPassage];
  const visibleQuestions = test.questions.slice(activeRange.start, activeRange.end);
  const passageBlocks = test.passage.split(/(?=PASSAGE\s+[123])/i);
  const visiblePassage = passageBlocks[currentPassage]?.trim() || test.passage;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Passage */}
      <Card className="lg:row-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            {activeRange.label}: {test.topic}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{visiblePassage}</p>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline">
            {answeredCount}/{test.questions.length} answered
          </Badge>
          <Progress value={progress} className="w-32 h-2" />
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-4 pr-4">
            {visibleQuestions.map((q, index) => (
              <Card key={q.id} className={answers[q.id] ? "border-primary/50" : ""}>
                <CardContent className="p-4">
                  <p className="font-medium text-sm mb-3">
                    <span className="text-primary mr-2">Q{activeRange.start + index + 1}.</span>
                    {q.question}
                  </p>

                  {q.type === "multiple-choice" || q.type === "true-false-not-given" ? (
                    <RadioGroup
                      value={answers[q.id] || ""}
                      onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                      disabled={isPaused}
                    >
                      {q.options?.map((option, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={q.type === "true-false-not-given" ? option : option.charAt(0)}
                            id={`q${q.id}-${i}`}
                          />
                          <Label htmlFor={`q${q.id}-${i}`} className="text-sm cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <Input
                      placeholder="Type your answer..."
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      className="text-sm"
                      disabled={isPaused}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentPassage((p) => Math.max(0, p - 1))} disabled={currentPassage === 0 || isPaused} className="flex-1 gap-2">
            <ChevronLeft className="w-4 h-4" /> Previous Passage
          </Button>
          <Button variant="outline" onClick={() => setCurrentPassage((p) => Math.min(2, p + 1))} disabled={currentPassage === 2 || isPaused} className="flex-1 gap-2">
            Next Passage <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button 
          onClick={submitTest} 
          disabled={isSubmitting || isPaused || answeredCount === 0}
          className="w-full gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scoring...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Submit Reading ({answeredCount}/{test.questions.length})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
