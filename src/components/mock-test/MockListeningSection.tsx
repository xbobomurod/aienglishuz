import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, Headphones, Play, Volume2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
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

interface SpeechLine {
  speaker?: string;
  text: string;
}

export function MockListeningSection({ onComplete, isPaused }: MockListeningSectionProps) {
  const { user } = useAuth();
  const [test, setTest] = useState<ListeningTest | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const [currentPart, setCurrentPart] = useState(0);

  // IELTS-style single-play state
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentLineIdx, setCurrentLineIdx] = useState(-1);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechQueueRef = useRef<SpeechLine[]>([]);
  const spokenCharsRef = useRef(0);
  const isStoppingRef = useRef(false);
  const voiceMapRef = useRef<Map<string, SpeechSynthesisVoice>>(new Map());
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    generateTest();
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        isStoppingRef.current = true;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Load voices asynchronously (Chrome quirk)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => { availableVoicesRef.current = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Only allow "soft pause" via the outer mock timer pause (freeze the queue,
  // do NOT let user manually pause/rewind — real IELTS rules).
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isPaused && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    } else if (!isPaused && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
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

  // ---- Speaker-aware TTS (male/female alternating, Neural voices preferred) ----
  const FEMALE_RE = /Samantha|Karen|Moira|Jenny|Aria|Zira|Susan|Hazel|Catherine|Serena|Kate|Fiona|Tessa|Victoria|Ava|Allison|Amelia|Sonia|Libby|Female|UK English Female|US English Female/i;
  const MALE_RE = /Daniel|George|Ryan|David|Mark|Alex|Fred|Oliver|Arthur|Aaron|Tom|Guy|Male|UK English Male|US English Male/i;
  const QUALITY_RE = /Neural|Natural|Enhanced|Premium|Google|Microsoft|Online|\(Natural\)/i;

  const pickBestVoice = (opts: { female?: boolean; male?: boolean; prefLang?: string; exclude?: Set<string> }) => {
    const all = availableVoicesRef.current.length ? availableVoicesRef.current : window.speechSynthesis.getVoices();
    let pool = all.filter(v => v.lang.startsWith("en-"));
    if (opts.prefLang) {
      const langPool = pool.filter(v => v.lang.toLowerCase() === opts.prefLang!.toLowerCase());
      if (langPool.length) pool = langPool;
    }
    if (opts.exclude) pool = pool.filter(v => !opts.exclude!.has(v.name)) || pool;
    const gendered = pool.filter(v => (opts.female && FEMALE_RE.test(v.name)) || (opts.male && MALE_RE.test(v.name)));
    const genderedQuality = gendered.filter(v => QUALITY_RE.test(v.name));
    return genderedQuality[0] || gendered[0] || pool.find(v => QUALITY_RE.test(v.name)) || pool[0];
  };

  const prepareSpeechLines = (transcript: string): SpeechLine[] => transcript
    .replace(/\bSECTION\s+(\d)\b/gi, "\nSection $1.\n")
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^([A-Z][A-Z\s]*(?:\s+[A-D])?|Speaker\s+[A-D]|Tutor|Student|Guide|Lecturer|Woman|Man|Agent|Customer)\s*:\s*(.+)$/i);
      return { speaker: match?.[1]?.trim(), text: (match?.[2] || line).replace(/([.!?])\s+/g, "$1 ... ") };
    });

  const buildVoiceMap = (lines: SpeechLine[]) => {
    voiceMapRef.current.clear();
    const used = new Set<string>();
    const speakers: string[] = [];
    for (const l of lines) {
      const key = (l.speaker || "narrator").toLowerCase();
      if (!speakers.includes(key)) speakers.push(key);
    }
    speakers.forEach((key, idx) => {
      const explicitFemale = /woman|female|customer|student|ms\.|mrs\.|miss|speaker\s*b|speaker\s*d/i.test(key);
      const explicitMale = /man|male|agent|tutor|lecturer|mr\.|sir|speaker\s*a|speaker\s*c/i.test(key);
      const wantFemale = explicitFemale ? true : explicitMale ? false : idx % 2 === 0;
      const langPref = idx % 2 === 0 ? "en-GB" : "en-US";
      const v = pickBestVoice({ female: wantFemale, male: !wantFemale, prefLang: langPref, exclude: used });
      if (v) { voiceMapRef.current.set(key, v); used.add(v.name); }
    });
  };

  const speakQueuedLine = (index: number) => {
    if (!test || typeof window === "undefined" || !window.speechSynthesis) return;
    const line = speechQueueRef.current[index];
    if (!line) {
      setPlaybackProgress(100);
      setAudioFinished(true);
      setCurrentLineIdx(-1);
      return;
    }

    const isFemale = /woman|female|customer|student|ms\.|mrs\.|miss|speaker\s*b|speaker\s*d/i.test(line.speaker || "");
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.rate = isFemale ? 0.98 : 0.94;
    utterance.pitch = 1 + (isFemale ? 0.08 : -0.05) + (/\?/.test(line.text) ? 0.04 : 0);
    utterance.volume = 1;
    const v = voiceMapRef.current.get((line.speaker || "narrator").toLowerCase());
    if (v) utterance.voice = v;

    utterance.onstart = () => setCurrentLineIdx(index);
    utterance.onboundary = (e) => {
      const total = test.transcript.length || 1;
      setPlaybackProgress(Math.min(((spokenCharsRef.current + e.charIndex) / total) * 100, 99));
    };
    utterance.onend = () => {
      if (isStoppingRef.current) return;
      spokenCharsRef.current += line.text.length + 1;
      window.setTimeout(() => speakQueuedLine(index + 1), 180);
    };

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!test || typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Text-to-speech is not available in your browser");
      return;
    }
    isStoppingRef.current = false;
    window.speechSynthesis.cancel();
    const lines = prepareSpeechLines(test.transcript);
    speechQueueRef.current = lines;
    buildVoiceMap(lines);
    spokenCharsRef.current = 0;
    setAudioStarted(true);
    setAudioFinished(false);
    setPlaybackProgress(0);
    // Small delay so the user sees the transition
    window.setTimeout(() => speakQueuedLine(0), 400);
  };

  const submitTest = async () => {
    if (!test) return;

    setIsSubmitting(true);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      isStoppingRef.current = true;
      window.speechSynthesis.cancel();
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

  // ---- IELTS-style Start gate ----
  if (!audioStarted) {
    return (
      <Card className="border-accent/40">
        <CardContent className="py-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <Headphones className="w-8 h-8 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground">Ready for the Listening Test</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              You will hear a recording <strong>once only</strong>. Answer the questions as you listen —
              you cannot pause, rewind, or replay the audio. Just like the real IELTS exam.
            </p>
          </div>
          <div className="rounded-lg bg-accent/5 border border-accent/20 p-4 max-w-md mx-auto text-left text-sm">
            <div className="flex items-start gap-2 text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div>
                Check that your speakers or headphones are working, then press <strong>Start</strong>.
                The audio begins immediately and plays through all 4 sections.
              </div>
            </div>
          </div>
          <Button onClick={startListening} size="lg" className="gap-2" disabled={isPaused}>
            <Play className="w-5 h-5" />
            Start Listening
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-accent" />
              {activeRange.label}: {test.topic}
            </CardTitle>
            <Badge variant={audioFinished ? "outline" : "secondary"} className="gap-1">
              {audioFinished ? "Audio ended" : "Playing…"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{test.scenario}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Volume2 className={`w-5 h-5 text-accent ${!audioFinished ? "animate-pulse" : ""}`} />
            </div>
            <div className="flex-1">
              <Progress value={playbackProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {audioFinished
                  ? "The recording has ended. Complete your answers and submit."
                  : "Audio plays once — no pause, rewind, or replay."}
              </p>
            </div>
          </div>
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
              {visibleQuestions.map((q, index) => (
                <div 
                  key={q.id} 
                  className={`p-4 rounded-lg border ${answers[q.id] ? "border-accent/50 bg-accent/5" : "border-border"}`}
                >
                  <p className="font-medium text-sm mb-3">
                    <span className="text-accent mr-2">Q{activeRange.start + index + 1}.</span>
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

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setCurrentPart((p) => Math.max(0, p - 1))} disabled={currentPart === 0 || isPaused} className="flex-1 gap-2">
              <ChevronLeft className="w-4 h-4" /> Previous Section
            </Button>
            <Button variant="outline" onClick={() => setCurrentPart((p) => Math.min(3, p + 1))} disabled={currentPart === 3 || isPaused} className="flex-1 gap-2">
              Next Section <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

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
