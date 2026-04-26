import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Loader2, CheckCircle2, Headphones, Play, Pause, Volume2, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MockListeningSectionProps {
  onComplete: (bandScore: number) => void;
  isPaused: boolean;
}

interface Question {
  id: number;
  type: "multiple-choice" | "fill-blank";
  question: string;
  options?: string[];
  correctAnswer: string;
}

interface ListeningTest {
  topic: string;
  scenario: string;
  transcript: string;
  questions: Question[];
}

export function MockListeningSection({ onComplete, isPaused }: MockListeningSectionProps) {
  const { user } = useAuth();
  const [test, setTest] = useState<ListeningTest | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const [currentPart, setCurrentPart] = useState(0);
  
  // Audio controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [speechRate, setSpeechRate] = useState(1);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    generateTest();
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Pause audio when test is paused
  useEffect(() => {
    if (isPaused && isPlaying) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      }
    }
  }, [isPaused]);

  const generateTest = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("listening-test", {
        body: { action: "generate", section: "full-test" }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setTest(data);
    } catch (err) {
      console.error("Error generating test:", err);
      toast.error("Failed to generate listening test.");
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = () => {
    if (!test || typeof window === "undefined" || !window.speechSynthesis || isPaused) {
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(visibleTranscript);
    utterance.rate = speechRate;
    utterance.pitch = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith("en-") && v.name.includes("Google")) ||
                         voices.find(v => v.lang.startsWith("en-"));
    if (englishVoice) utterance.voice = englishVoice;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      setPlaybackProgress(100);
    };
    utterance.onpause = () => setIsPlaying(false);
    utterance.onboundary = (e) => {
      const progress = (e.charIndex / visibleTranscript.length) * 100;
      setPlaybackProgress(progress);
    };

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const submitTest = async () => {
    if (!test) return;

    setIsSubmitting(true);
    
    // Stop audio
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
    
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    try {
      const userAnswers = test.questions.map(q => answers[q.id] || "");
      const correctAnswers = test.questions.map(q => q.correctAnswer);

      const { data, error } = await supabase.functions.invoke("listening-test", {
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
        await supabase.from("listening_evaluations").insert({
          user_id: user.id,
          audio_topic: test.topic,
          transcript: test.transcript,
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

      toast.success(`Listening completed! Band Score: ${data.bandScore}`);
      onComplete(data.bandScore);
    } catch (err) {
      console.error("Error submitting test:", err);
      toast.error("Failed to submit test.");
      onComplete(5.0);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-muted-foreground">Generating your listening test...</p>
        </CardContent>
      </Card>
    );
  }

  if (!test) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-destructive">Failed to load the listening test.</p>
          <Button onClick={generateTest} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / test.questions.length) * 100;
  const sectionRanges = [
    { label: "Section 1", start: 0, end: 10 },
    { label: "Section 2", start: 10, end: 20 },
    { label: "Section 3", start: 20, end: 30 },
    { label: "Section 4", start: 30, end: 40 },
  ];
  const activeRange = sectionRanges[currentPart];
  const visibleQuestions = test.questions.slice(activeRange.start, activeRange.end);
  const transcriptBlocks = test.transcript.split(/(?=SECTION\s+[1-4])/i);
  const visibleTranscript = transcriptBlocks[currentPart]?.trim() || test.transcript;

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-accent" />
              {test.topic}
            </CardTitle>
            <Badge variant="secondary">Listening</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{test.scenario}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant={isPlaying ? "secondary" : "default"}
              size="icon"
              onClick={playAudio}
              disabled={isPaused}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <div className="flex-1">
              <Progress value={playbackProgress} className="h-2" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript(!showTranscript)}
              className="gap-1"
            >
              {showTranscript ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showTranscript ? "Hide" : "Show"} Transcript
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Speed:</span>
            <Slider
              value={[speechRate]}
              onValueChange={([v]) => setSpeechRate(v)}
              min={0.5}
              max={1.5}
              step={0.1}
              className="w-32"
              disabled={isPaused}
            />
            <span className="text-sm font-mono">{speechRate.toFixed(1)}x</span>
          </div>

          {showTranscript && (
            <ScrollArea className="h-[150px] p-4 rounded-lg bg-secondary/50">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{test.transcript}</p>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Headphones className="w-5 h-5 text-accent" />
              Questions
            </CardTitle>
            <Badge variant="outline">{answeredCount}/{test.questions.length} answered</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4 pr-4">
              {test.questions.map((q, index) => (
                <div 
                  key={q.id} 
                  className={`p-4 rounded-lg border ${answers[q.id] ? "border-accent/50 bg-accent/5" : "border-border"}`}
                >
                  <p className="font-medium text-sm mb-3">
                    <span className="text-accent mr-2">Q{index + 1}.</span>
                    {q.question}
                  </p>

                  {q.type === "multiple-choice" ? (
                    <RadioGroup
                      value={answers[q.id] || ""}
                      onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                      disabled={isPaused}
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
                      disabled={isPaused}
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <Button 
            onClick={submitTest} 
            disabled={isSubmitting || isPaused || answeredCount === 0}
            className="w-full mt-4 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scoring...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Submit Listening ({answeredCount}/{test.questions.length})
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
