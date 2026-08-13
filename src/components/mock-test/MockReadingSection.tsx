import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, BookOpen, ChevronRight, ChevronLeft, Flag, Type, ClipboardList, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [fontSize, setFontSize] = useState<number>(14); // px
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<"all" | "unanswered" | "flagged">("all");
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
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

  const passageIndexForQ = (idx: number) => (idx < 13 ? 0 : idx < 26 ? 1 : 2);

  const jumpToQuestion = (idx: number) => {
    const pIdx = passageIndexForQ(idx);
    const q = test.questions[idx];
    setReviewOpen(false);
    if (pIdx !== currentPassage) setCurrentPassage(pIdx);
    // Scroll after layout settles
    window.setTimeout(() => {
      const el = questionRefs.current[q.id];
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("ring-2", "ring-primary/60");
      window.setTimeout(() => el?.classList.remove("ring-2", "ring-primary/60"), 1500);
    }, pIdx !== currentPassage ? 120 : 0);
  };

  const filteredForReview = test.questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => {
      if (reviewTab === "unanswered") return !answers[q.id];
      if (reviewTab === "flagged") return !!flagged[q.id];
      return true;
    });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Passage */}
      <Card className="lg:row-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-primary" />
              {activeRange.label}: {test.topic}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Type className="w-4 h-4 text-muted-foreground" />
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setFontSize((s) => Math.max(12, s - 1))} disabled={isPaused}>A-</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setFontSize((s) => Math.min(22, s + 1))} disabled={isPaused}>A+</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-230px)] min-h-[420px] pr-4">
            <p
              className="font-serif leading-relaxed whitespace-pre-wrap selection:bg-primary/30"
              style={{ fontSize: `${fontSize}px` }}
            >
              {visiblePassage}
            </p>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{answeredCount}/{test.questions.length} answered</Badge>
            {flaggedCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Flag className="w-3 h-3" /> {flaggedCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-24 h-2" />
            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 gap-1" disabled={isPaused}>
                  <ClipboardList className="w-3.5 h-3.5" /> Review
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Question Review</DialogTitle>
                </DialogHeader>
                <Tabs value={reviewTab} onValueChange={(v) => setReviewTab(v as typeof reviewTab)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="all">All ({test.questions.length})</TabsTrigger>
                    <TabsTrigger value="unanswered">
                      Unanswered ({test.questions.length - answeredCount})
                    </TabsTrigger>
                    <TabsTrigger value="flagged" className="gap-1">
                      <Flag className="w-3 h-3" /> Flagged ({flaggedCount})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value={reviewTab} className="mt-4">
                    {filteredForReview.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {reviewTab === "flagged"
                          ? "No flagged questions yet. Tap the flag icon on any question to save it here."
                          : reviewTab === "unanswered"
                          ? "Great — every question has an answer."
                          : "No questions."}
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-8 gap-2">
                          {filteredForReview.map(({ q, i }) => {
                            const answered = !!answers[q.id];
                            const isFlag = !!flagged[q.id];
                            return (
                              <button
                                key={q.id}
                                onClick={() => jumpToQuestion(i)}
                                className={`relative h-9 rounded text-xs font-medium border transition-colors ${
                                  answered
                                    ? "bg-primary/10 border-primary/40 text-primary"
                                    : "bg-muted border-border text-muted-foreground hover:bg-accent/10"
                                }`}
                                title={q.question}
                              >
                                {i + 1}
                                {isFlag && (
                                  <Flag className="w-3 h-3 absolute -top-1 -right-1 text-accent fill-accent" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {reviewTab === "flagged" && (
                          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
                            {filteredForReview.map(({ q, i }) => (
                              <button
                                key={`row-${q.id}`}
                                onClick={() => jumpToQuestion(i)}
                                className="w-full text-left p-2.5 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-start gap-2"
                              >
                                <Badge variant="outline" className="shrink-0 text-[10px]">Q{i + 1}</Badge>
                                <span className="text-xs text-muted-foreground line-clamp-2">{q.question}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>
                </Tabs>
                <p className="text-xs text-muted-foreground mt-3">
                  Tap a number to jump directly to that question.
                </p>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Flagged quick strip */}
        {flaggedCount > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg border border-accent/30 bg-accent/5 overflow-x-auto">
            <Flag className="w-3.5 h-3.5 text-accent shrink-0 fill-accent" />
            <span className="text-[11px] font-medium text-accent shrink-0">Flagged:</span>
            <div className="flex items-center gap-1.5 flex-1">
              {test.questions.map((q, i) => flagged[q.id] ? (
                <div key={q.id} className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => jumpToQuestion(i)}
                    className="h-6 min-w-[28px] px-1.5 rounded text-[11px] font-semibold bg-background border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {i + 1}
                  </button>
                  <button
                    onClick={() => setFlagged((f) => ({ ...f, [q.id]: false }))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Unflag Q${i + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null)}
            </div>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-390px)] min-h-[340px]">
          <div className="space-y-4 pr-4">
            {visibleQuestions.map((q, index) => (
              <Card
                key={q.id}
                ref={(el) => { questionRefs.current[q.id] = el; }}
                className={`transition-shadow ${answers[q.id] ? "border-primary/50" : ""} ${flagged[q.id] ? "border-accent/60 bg-accent/5" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="font-medium text-base leading-snug">
                      <span className="text-primary mr-2">Q{activeRange.start + index + 1}.</span>
                      {q.question}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))}
                      disabled={isPaused}
                      aria-label="Flag for review"
                    >
                      <Flag className={`w-4 h-4 ${flagged[q.id] ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                    </Button>
                  </div>

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
                          <Label htmlFor={`q${q.id}-${i}`} className="text-[15px] leading-relaxed cursor-pointer">
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
                      className="h-11 text-[15px]"
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
