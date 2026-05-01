import { useState, useEffect, useMemo, useRef } from "react";
import { 
  ArrowLeft, 
  Headphones, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Clock,
  Trophy,
  Lightbulb,
  Play,
  Pause,
  Volume2,
  Eye,
  EyeOff,
  ChevronDown,
  Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

interface ListeningModuleProps {
  onBack: () => void;
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

interface SpeechLine {
  speaker?: string;
  text: string;
}

export function ListeningModule({ onBack }: ListeningModuleProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { saveSession, loadSession } = useTestSession("listening");
  const [section, setSection] = useState<"full-test" | "1" | "2" | "3" | "4">("full-test");
  const [test, setTest] = useState<ListeningTest | null>(null);
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [fastPractice, setFastPractice] = useState(true);
  const [fastWordCount, setFastWordCount] = useState(190);
  const [fastQuestionCount, setFastQuestionCount] = useState(6);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [generationMs, setGenerationMs] = useState<number | null>(null);
  const [scoringMs, setScoringMs] = useState<number | null>(null);

  const estimatedGenMs = fastPractice
    ? Math.round(1500 + fastWordCount * 8 + fastQuestionCount * 150)
    : section === "full-test"
      ? 32000
      : 11000;
  const estimatedScoreMs = fastPractice ? 250 : 600;
  const formatMs = (ms: number) => ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
  
  // Audio simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [speechRate, setSpeechRate] = useState(1);
  const [voiceStyle, setVoiceStyle] = useState<"exam" | "natural" | "expressive">("natural");
  const [activeSection, setActiveSection] = useState("0");
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechQueueRef = useRef<SpeechLine[]>([]);
  const speechIndexRef = useRef(0);
  const spokenCharsRef = useRef(0);
  const isStoppingRef = useRef(false);

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

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const id = searchParams.get("test");
    if (!id || testSessionId === id) return;

    setIsLoading(true);
    loadSession<ListeningTest>(id)
      .then((session) => {
        if (!session) return;
        setTest(session.content);
        setTestSessionId(session.id);
        setResult(null);
        setAnswers({});
        setShowTranscript(false);
        setPlaybackProgress(0);
        setActiveSection("0");
        setStartTime(Date.now());
        setElapsedTime(0);
      })
      .catch(() => toast.error("Could not load this listening test ID."))
      .finally(() => setIsLoading(false));
  }, [loadSession, searchParams, testSessionId]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const loadTestById = (id: string) => {
    stopAudio();
    setSearchParams({ test: id });
  };

  const generateTest = async () => {
    setIsLoading(true);
    setResult(null);
    setAnswers({});
    setShowTranscript(false);
    setPlaybackProgress(0);
    setActiveSection("0");
    setGenerationMs(null);
    setScoringMs(null);
    const t0 = performance.now();
    
    try {
      const { data, error } = await supabase.functions.invoke("listening-test", {
        body: {
          action: "generate",
          section,
          fastMode: fastPractice,
          fastWordCount: fastPractice ? fastWordCount : undefined,
          fastQuestionCount: fastPractice ? fastQuestionCount : undefined,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const elapsed = Math.round(performance.now() - t0);
      setGenerationMs(elapsed);
      setTest(data);
      if (user) {
        const session = await saveSession({
          variant: section,
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
      toast.success(`Listening test ready in ${formatMs(elapsed)}`);
    } catch (err) {
      console.error("Error generating test:", err);
      toast.error("Failed to generate test. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getVoiceSettings = () => {
    switch (voiceStyle) {
      case "exam":
        return { rate: speechRate * 0.92, pitch: 1, volume: 0.95 };
      case "expressive":
        return { rate: speechRate * 1.02, pitch: 1.12, volume: 1 };
      default:
        return { rate: speechRate, pitch: 1.06, volume: 1 };
    }
  };

  const prepareSpeechLines = (transcript: string): SpeechLine[] => {
    return transcript
      .replace(/\bSECTION\s+(\d)\b/gi, "\nSection $1.\n")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([A-Z][A-Z\s]*(?:\s+[A-D])?|Speaker\s+[A-D]|Tutor|Student|Guide|Lecturer|Woman|Man|Agent|Customer)\s*:\s*(.+)$/i);
        const speaker = match?.[1]?.trim();
        const text = (match?.[2] || line).replace(/([.!?])\s+/g, "$1 ... ");
        return { speaker, text };
      });
  };

  const selectEnglishVoice = (speaker?: string) => {
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(v => v.lang.startsWith("en-"));
    const normalized = speaker?.toLowerCase() || "";
    const preferFemale = /customer|woman|student|speaker\s*b|speaker\s*d/i.test(normalized);
    const preferMale = /agent|man|tutor|guide|lecturer|speaker\s*a|speaker\s*c/i.test(normalized);

    if (preferFemale) {
      const femaleVoice = englishVoices.find(v => /Samantha|Karen|Moira|Jenny|Aria|Zira|Susan|Hazel|Catherine|Female|Google UK English Female/i.test(v.name));
      return femaleVoice || englishVoices[1] || englishVoices[0];
    }

    if (preferMale) {
      const maleVoice = englishVoices.find(v => /Daniel|George|Ryan|David|Mark|Male|Google UK English Male/i.test(v.name));
      return maleVoice || englishVoices[0];
    }

    return englishVoices.find(v => /Samantha|Daniel|Karen|Moira|Google|Microsoft|Natural|Online/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith("en-GB")) ||
      englishVoices[0];
  };

  const speakQueuedLine = (index: number) => {
    if (!test || typeof window === "undefined" || !window.speechSynthesis) return;
    const line = speechQueueRef.current[index];

    if (!line) {
      setIsPlaying(false);
      setPlaybackProgress(100);
      return;
    }

    const settings = getVoiceSettings();
    const utterance = new SpeechSynthesisUtterance(line.text);
    const speakerTone = /customer|woman|student|speaker\s*b|speaker\s*d/i.test(line.speaker || "") ? 0.08 : -0.03;
    utterance.rate = settings.rate * (/customer/i.test(line.speaker || "") ? 1.02 : 0.98);
    utterance.pitch = voiceStyle !== "exam" ? settings.pitch + speakerTone + (/\?/.test(line.text) ? 0.04 : 0) : settings.pitch;
    utterance.volume = settings.volume;

    const englishVoice = selectEnglishVoice(line.speaker);
    if (englishVoice) utterance.voice = englishVoice;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onboundary = (e) => {
      const totalChars = test.transcript.length || 1;
      const progress = ((spokenCharsRef.current + e.charIndex) / totalChars) * 100;
      setPlaybackProgress(Math.min(progress, 99));
    };
    utterance.onend = () => {
      if (isStoppingRef.current) return;
      spokenCharsRef.current += line.text.length + 1;
      speechIndexRef.current = index + 1;
      window.setTimeout(() => speakQueuedLine(index + 1), voiceStyle === "expressive" ? 220 : 120);
    };
    utterance.onpause = () => setIsPlaying(false);

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const playAudio = () => {
    if (!test || typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Text-to-speech is not available in your browser");
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

    isStoppingRef.current = false;
    window.speechSynthesis.cancel();
    speechQueueRef.current = prepareSpeechLines(test.transcript);
    speechIndexRef.current = 0;
    spokenCharsRef.current = 0;
    speakQueuedLine(0);
  };

  const stopAudio = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      isStoppingRef.current = true;
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setPlaybackProgress(0);
    }
  };

  const submitTest = async () => {
    if (!test) return;

    setIsSubmitting(true);
    stopAudio();
    const timeTaken = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
    const t0 = performance.now();

    try {
      const userAnswers = test.questions.map(q => answers[q.id] || "");
      const correctAnswers = test.questions.map(q => q.correctAnswer);

      const { data, error } = await supabase.functions.invoke("listening-test", {
        body: {
          action: "score",
          userAnswers,
          correctAnswers,
          totalQuestions: test.questions.length,
          fastMode: fastPractice
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const elapsed = Math.round(performance.now() - t0);
      setScoringMs(elapsed);
      setResult(data);
      setShowTranscript(true);

      // Save to database
      if (user) {
        const insertData = {
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
        };
        await supabase.from("listening_evaluations").insert(insertData as any);
      }

      toast.success(`Scored in ${formatMs(elapsed)} — Band ${data.bandScore}`);
    } catch (err) {
      console.error("Error submitting test:", err);
      toast.error("Failed to submit test. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSectionDescription = (s: string) => {
    switch (s) {
      case "full-test": return "All four IELTS sections, 40 questions";
      case "1": return "Everyday conversation (e.g., booking, appointments)";
      case "2": return "Monologue in social context (e.g., tour guide)";
      case "3": return "Educational discussion (e.g., student project)";
      case "4": return "Academic lecture";
      default: return "";
    }
  };

  const transcriptSections = useMemo(() => test?.transcript
    .split(/(?=\bSection\s+\d\b|\bSECTION\s+\d\b)/i)
    .map((sectionText) => sectionText.trim())
    .filter(Boolean) || [], [test?.transcript]);

  const visibleSections = useMemo(() => transcriptSections.length > 1 ? transcriptSections : test ? [test.transcript] : [], [transcriptSections, test]);

  const getQuestionsForSection = (sectionIndex: number) => {
    if (!test) return [];
    if (visibleSections.length < 2) return test.questions;

    const perSection = Math.ceil(test.questions.length / visibleSections.length);
    const start = sectionIndex * perSection + 1;
    const end = Math.min((sectionIndex + 1) * perSection, test.questions.length);
    return test.questions.filter((question) => question.id >= start && question.id <= end);
  };

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
            Listening Module
          </h1>
          <p className="text-muted-foreground text-sm">
            Practice IELTS Listening with AI-generated audio scripts
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
              <Headphones className="w-5 h-5 text-accent" />
              Start a Listening Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Section Type</Label>
              <Select value={section} onValueChange={(v) => setSection(v as typeof section)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-test">Full Test - {getSectionDescription("full-test")}</SelectItem>
                  <SelectItem value="1">Section 1 - {getSectionDescription("1")}</SelectItem>
                  <SelectItem value="2">Section 2 - {getSectionDescription("2")}</SelectItem>
                  <SelectItem value="3">Section 3 - {getSectionDescription("3")}</SelectItem>
                  <SelectItem value="4">Section 4 - {getSectionDescription("4")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="space-y-1">
                <Label htmlFor="listening-fast-practice" className="text-sm font-medium">Fast Practice</Label>
                <p className="text-xs text-muted-foreground">
                  Short transcript, 6 questions, and instant static feedback without external AI scoring.
                </p>
              </div>
              <Switch
                id="listening-fast-practice"
                checked={fastPractice}
                onCheckedChange={setFastPractice}
                aria-label="Toggle fast listening practice"
              />
            </div>

            {fastPractice && (
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Advanced Fast Practice settings
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Transcript length</Label>
                      <span className="text-xs text-muted-foreground">{fastWordCount} words</span>
                    </div>
                    <Slider
                      value={[fastWordCount]}
                      onValueChange={(v) => setFastWordCount(v[0])}
                      min={120}
                      max={400}
                      step={20}
                    />
                    <p className="text-xs text-muted-foreground">Shorter = faster generation. Default 190.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Number of questions</Label>
                      <span className="text-xs text-muted-foreground">{fastQuestionCount} questions</span>
                    </div>
                    <Slider
                      value={[fastQuestionCount]}
                      onValueChange={(v) => setFastQuestionCount(v[0])}
                      min={3}
                      max={10}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">Scoring stays instant — no external AI feedback call.</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            <div className="p-4 rounded-lg bg-accent/10 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What to expect:</p>
              <ul className="list-disc list-inside space-y-1">
                {fastPractice && <li>Fast Practice: ~{fastWordCount}-word script with {fastQuestionCount} questions</li>}
                <li>Full Listening option: 4 sections, 40 questions, official sequence</li>
                <li>Question types include completion, matching, short answer and multiple choice</li>
                <li>Practice mode allows replay before scoring</li>
                <li>Instant scoring with IELTS band feedback</li>
              </ul>
            </div>

            <Button onClick={generateTest} className="w-full gap-2">
              <Headphones className="w-4 h-4" />
              Generate Listening Test
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground">Generating your listening test...</p>
          </CardContent>
        </Card>
      )}

      {/* Test in progress */}
      {test && !result && !isLoading && (
        <div className="space-y-6">
          {visibleSections.length > 1 && (
            <Tabs value={activeSection} onValueChange={setActiveSection}>
              <TabsList className="grid w-full grid-cols-4">
                {visibleSections.map((_, index) => (
                  <TabsTrigger key={index} value={String(index)}>Section {index + 1}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Audio Player */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-accent" />
                  {test.topic}
                </CardTitle>
                <Badge variant="secondary">Section {section}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{test.scenario}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Playback controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant={isPlaying ? "secondary" : "default"}
                  size="icon"
                  onClick={playAudio}
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

              {/* Voice controls */}
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Voice style</Label>
                  <Select value={voiceStyle} onValueChange={(v) => setVoiceStyle(v as typeof voiceStyle)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam">Exam calm</SelectItem>
                      <SelectItem value="natural">Natural conversation</SelectItem>
                      <SelectItem value="expressive">Expressive practice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Speed</Label>
                    <span className="text-sm font-mono">{speechRate.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[speechRate]}
                    onValueChange={([v]) => setSpeechRate(v)}
                    min={0.5}
                    max={1.5}
                    step={0.1}
                  />
                </div>
              </div>

              {/* Transcript (hidden by default) */}
              {showTranscript && (
                <ScrollArea className="h-[200px] p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {visibleSections[Number(activeSection)] || test.transcript}
                  </p>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Questions</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {answeredCount}/{test.questions.length} answered
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-4 pr-4">
                  {getQuestionsForSection(Number(activeSection)).map((q) => (
                    <div 
                      key={q.id} 
                      className={`p-4 rounded-lg border ${answers[q.id] ? "border-accent/50 bg-accent/5" : "border-border"}`}
                    >
                      <p className="font-medium text-sm mb-3">
                        <span className="text-accent mr-2">Q{q.id}.</span>
                        {q.question}
                      </p>

                      {q.type === "multiple-choice" ? (
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
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button 
                onClick={submitTest} 
                disabled={isSubmitting || answeredCount === 0}
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
                    Submit Test ({answeredCount}/{test.questions.length})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {result && test && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="border-accent/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" />
                Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-accent/10">
                  <p className="text-3xl font-bold text-accent">{result.bandScore}</p>
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

              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-1">Feedback</p>
                    <p className="text-sm text-muted-foreground">{result.feedback}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{test.transcript}</p>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Answer Review */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Answer Review</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {result.results.map((r, index) => (
                    <div 
                      key={r.questionId}
                      className={`p-3 rounded-lg ${r.correct ? "bg-success/10" : "bg-destructive/10"}`}
                    >
                      <div className="flex items-start gap-2">
                        {r.correct ? (
                          <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Q{index + 1}: {test.questions[index]?.question}
                          </p>
                          <div className="flex gap-4 mt-1 text-sm">
                            <span className={r.correct ? "text-success" : "text-destructive"}>
                              Your answer: {r.userAnswer || "(blank)"}
                            </span>
                            {!r.correct && (
                              <span className="text-success">
                                Correct: {r.correctAnswer}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
