import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  BookOpen, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Clock,
  Trophy,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTestSession } from "@/hooks/useTestSession";
import { TestSessionControls } from "@/components/TestSessionControls";
import { toast } from "sonner";

interface ReadingModuleProps {
  onBack: () => void;
}

interface Question {
  id: number;
  type: "multiple-choice" | "true-false-not-given" | "fill-blank" | "matching";
  question: string;
  options?: string[];
  correctAnswer: string;
  evidenceQuote?: string;
}

interface ReadingTest {
  topic: string;
  passage: string;
  questions: Question[];
}

interface TestResult {
  correctCount: number;
  totalQuestions: number;
  bandScore: number;
  percentage: number;
  results: Array<{
    questionId: number;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
  }>;
  feedback: string;
}

export function ReadingModule({ onBack }: ReadingModuleProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { saveSession, loadSession } = useTestSession("reading");
  const [difficulty, setDifficulty] = useState<"full-test" | "passage-1" | "passage-2" | "passage-3">("full-test");
  const [test, setTest] = useState<ReadingTest | null>(null);
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activePassage, setActivePassage] = useState("0");

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && !result) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, result]);

  useEffect(() => {
    const id = searchParams.get("test");
    if (!id || testSessionId === id) return;

    setIsLoading(true);
    loadSession<ReadingTest>(id)
      .then((session) => {
        if (!session) return;
        setTest(session.content);
        setTestSessionId(session.id);
        setResult(null);
        setAnswers({});
        setActivePassage("0");
        setStartTime(Date.now());
        setElapsedTime(0);
      })
      .catch(() => toast.error("Could not load this reading test ID."))
      .finally(() => setIsLoading(false));
  }, [loadSession, searchParams, testSessionId]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const loadTestById = (id: string) => {
    setSearchParams({ test: id });
  };

  const generateTest = async () => {
    setIsLoading(true);
    setResult(null);
    setAnswers({});
    setActivePassage("0");
    
    try {
      const { data, error } = await supabase.functions.invoke("reading-test", {
        body: { action: "generate", difficulty }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setTest(data);
      if (user) {
        const session = await saveSession({
          variant: difficulty,
          title: data.topic,
          content: data,
        });
        if (session) {
          setTestSessionId(session.id);
          setSearchParams({ test: session.id });
        }
      }
      setStartTime(Date.now());
      setElapsedTime(0);
      toast.success("Reading test generated and saved with an ID!");
    } catch (err) {
      console.error("Error generating test:", err);
      toast.error("Failed to generate test. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitTest = async () => {
    if (!test) return;

    setIsSubmitting(true);
    const timeTaken = Math.floor((Date.now() - (startTime || Date.now())) / 1000);

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

      setResult(data);

      // Save to database
      if (user) {
        const insertData = {
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
        };
        await supabase.from("reading_evaluations").insert(insertData as any);
      }

      toast.success(`Test completed! Band Score: ${data.bandScore}`);
    } catch (err) {
      console.error("Error submitting test:", err);
      toast.error("Failed to submit test. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const passageSections = test?.passage
    .split(/(?=PASSAGE\s+\d\b)/i)
    .map((section) => section.trim())
    .filter(Boolean) || [];

  const formatPassageText = (text: string) => text
    .replace(/^(PASSAGE\s+\d.*)$/gim, "\n$1")
    .replace(/^([A-H])\.\s+/gm, "\n$1. ")
    .trim();

  const answeredCount = Object.keys(answers).length;
  const progress = test ? (answeredCount / test.questions.length) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Reading Module
          </h1>
          <p className="text-muted-foreground text-sm">
            Practice IELTS Reading with AI-generated passages
          </p>
        </div>
        {startTime && !result && (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(elapsedTime)}
          </Badge>
        )}
      </div>

      <TestSessionControls testId={testSessionId} title={test?.topic} onLoad={loadTestById} />

      {/* Test not started */}
      {!test && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Start a Reading Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">IELTS Passage Level</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-test">Full Academic Reading Test - 3 passages / 40 questions</SelectItem>
                  <SelectItem value="passage-1">Passage 1 - 13 questions</SelectItem>
                  <SelectItem value="passage-2">Passage 2 - standard IELTS difficulty</SelectItem>
                  <SelectItem value="passage-3">Passage 3 - most challenging text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-4 rounded-lg bg-primary/10 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What to expect:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Full Academic option: 3 passages, 40 questions, 60-minute standard</li>
                <li>Single-passage practice: Passage 1, 2, or 3 focus</li>
                <li>Multiple choice, matching, True/False/Not Given, and completion tasks</li>
                <li>Instant scoring with IELTS band feedback</li>
              </ul>
            </div>

            <Button onClick={generateTest} className="w-full gap-2">
              <BookOpen className="w-4 h-4" />
              Generate Reading Test
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Generating your reading test...</p>
          </CardContent>
        </Card>
      )}

      {/* Test in progress */}
      {test && !result && !isLoading && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Passage */}
          <Card className="lg:row-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{test.topic}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                  {(passageSections.length ? passageSections : [test.passage]).map((sectionText, index) => (
                    <div key={index} className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 p-4">
                      {formatPassageText(sectionText)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {answeredCount}/{test.questions.length} answered
              </span>
              <Progress value={progress} className="w-32 h-2" />
            </div>

            <ScrollArea className="h-[450px]">
              <div className="space-y-4 pr-4">
                {test.questions.map((q, index) => (
                  <Card key={q.id} className={answers[q.id] ? "border-primary/50" : ""}>
                    <CardContent className="p-4">
                      <p className="font-medium text-sm mb-3">
                        <span className="text-primary mr-2">Q{index + 1}.</span>
                        {q.question}
                      </p>

                      {q.type === "multiple-choice" || q.type === "true-false-not-given" || q.type === "matching" ? (
                        <RadioGroup
                          value={answers[q.id] || ""}
                          onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                        >
                          {q.options?.map((option, i) => (
                            <div key={i} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.charAt(0)} id={`q${q.id}-${i}`} />
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
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Button 
              onClick={submitTest} 
              disabled={isSubmitting || answeredCount === 0}
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
                  Submit Test ({answeredCount}/{test.questions.length})
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && test && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" />
                Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-primary/10">
                  <p className="text-3xl font-bold text-primary">{result.bandScore}</p>
                  <p className="text-sm text-muted-foreground">IELTS Band</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-success/10">
                  <p className="text-3xl font-bold text-success">{result.correctCount}/{result.totalQuestions}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-secondary">
                  <p className="text-3xl font-bold">{formatTime(elapsedTime)}</p>
                  <p className="text-sm text-muted-foreground">Time Taken</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-1">Feedback</p>
                    <p className="text-sm text-muted-foreground">{result.feedback}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answer Review */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Answer Review with Passage Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px]">
                <div className="space-y-3 pr-4">
                  {result.results.map((r, index) => {
                    const question = test.questions[index];
                    return (
                      <div 
                        key={r.questionId}
                        className={`p-4 rounded-lg border ${r.correct ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"}`}
                      >
                        <div className="flex items-start gap-2">
                          {r.correct ? (
                            <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                          )}
                          <div className="flex-1 space-y-3">
                            <p className="text-sm font-medium">
                              Q{index + 1}: {question?.question}
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm">
                              <Badge variant={r.correct ? "default" : "destructive"}>
                                Your answer: {r.userAnswer || "blank"}
                              </Badge>
                              <Badge variant="outline">
                                Correct: {r.correctAnswer}
                              </Badge>
                            </div>
                            {question?.evidenceQuote && (
                              <blockquote className="rounded-md border-l-4 border-primary bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Evidence:</span> “{question.evidenceQuote}”
                              </blockquote>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Try Again */}
          <Button onClick={generateTest} className="w-full gap-2" variant="outline">
            <RefreshCw className="w-4 h-4" />
            Start New Test
          </Button>
        </div>
      )}
    </div>
  );
}
