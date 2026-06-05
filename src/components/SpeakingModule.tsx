import { useEffect, useState } from "react";
import { Send, Loader2, ArrowLeft, Volume2, Lightbulb, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScoreDisplay } from "./ScoreDisplay";
import { DualScoreDisplay } from "./DualScoreDisplay";
import { CorrectionTable } from "./CorrectionTable";
import { ModelAnswer } from "./ModelAnswer";
import { ProgressReport } from "./ProgressReport";
import { TaskSelector, SpeakingTaskType } from "./TaskSelector";
import { PracticeTimer } from "./PracticeTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { VoiceRecorder } from "./VoiceRecorder";
import { ExaminerVoice } from "./ExaminerVoice";
import { ZoomExamRoom } from "./ZoomExamRoom";
import examinerImg from "@/assets/examiner.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { useEvaluationHistory } from "@/hooks/useEvaluationHistory";
import { useTestSession } from "@/hooks/useTestSession";
import { TestSessionControls } from "@/components/TestSessionControls";
import { toast } from "sonner";

interface SpeakingModuleProps {
  onBack: () => void;
}

interface SpeakingFeedback {
  bandScore: number;
  scoreJustification: string;
  fluencyScore: number;
  vocabularyScore: number;
  grammarScore: number;
  pronunciationScore?: number;
  spatialLanguageScore?: number;
  coherenceScore?: number;
  analyticalScore?: number;
  transcriptWithHighlights: string;
  prepositionAnalysis?: {
    used: string[];
    missing: string[];
    feedback: string;
  };
  topicCoverage?: {
    covered: string[];
    missed: string[];
    feedback: string;
  };
  argumentAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    feedback: string;
  };
  fillerWords: Array<{
    word: string;
    count: number;
    suggestion: string;
  }>;
  vocabularyUpgrades: Array<{
    original: string;
    upgrade: string;
    example: string;
  }>;
  grammarCorrections: Array<{
    mistake: string;
    correction: string;
    explanation?: string;
  }>;
  nativeUpgrade: string;
  dailyPracticeTip: string;
  overallFeedback: string;
}

export function SpeakingModule({ onBack }: SpeakingModuleProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { saveSession, loadSession } = useTestSession("speaking");
  const [taskType, setTaskType] = useState<SpeakingTaskType>("interview");
  const [topic, setTopic] = useState("");
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  const [timedMode, setTimedMode] = useState(false);
  const [cueNotes, setCueNotes] = useState("");
  const [hideTopicWhileSpeaking, setHideTopicWhileSpeaking] = useState(false);
  const [zoomMode, setZoomMode] = useState(false);

  const {
    saveSpeakingEvaluation, 
    getPreviousSpeakingScore,
    speakingHistory 
  } = useEvaluationHistory();

  const loadTestById = (id: string) => {
    setSearchParams({ test: id });
  };

  useEffect(() => {
    const id = searchParams.get("test");
    if (!id || testSessionId === id) return;

    loadSession<{ taskType: SpeakingTaskType; topic: string }>(id)
      .then((session) => {
        if (!session) return;
        setTaskType(session.content.taskType);
        setTopic(session.content.topic);
        setTestSessionId(session.id);
      })
      .catch(() => toast.error("Could not load this speaking test ID."));
  }, [loadSession, searchParams, testSessionId]);

  const handleGeneratePrompt = async () => {
    setIsGeneratingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-speaking', {
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
    if (!transcript.trim()) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-speaking', {
        body: { 
          transcript, 
          topic: topic || undefined, 
          taskType
        }
      });

      if (error) {
        console.error("Error analyzing speaking:", error);
        toast.error("Failed to analyze speaking. Please try again.");
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setFeedback(data);
      
      const { error: saveError } = await saveSpeakingEvaluation({
        topic: topic || undefined,
        transcript,
        bandScore: data.bandScore,
        fluencyScore: data.fluencyScore,
        vocabularyScore: data.vocabularyScore,
        grammarScore: data.grammarScore,
        fillerWords: data.fillerWords,
        vocabularyUpgrades: data.vocabularyUpgrades,
        grammarCorrections: data.grammarCorrections,
        nativeUpgrade: data.nativeUpgrade,
        dailyPracticeTip: data.dailyPracticeTip,
        overallFeedback: data.overallFeedback
      });

      if (saveError) {
        toast.success(`Speaking analyzed! IELTS Band: ${data.bandScore}`);
      } else {
        setSavedTaskId(crypto.randomUUID());
        toast.success(`Speaking analyzed and saved! IELTS Band: ${data.bandScore}`);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const previousScore = getPreviousSpeakingScore();

  const getImprovementAreas = (): string[] => {
    if (!feedback || speakingHistory.length < 1) return [];
    const areas: string[] = [];
    const prev = speakingHistory[0];
    
    if (prev) {
      if (feedback.fluencyScore > (prev.fluency_score || 0)) {
        areas.push("Fluency improved - fewer hesitations!");
      }
      if (feedback.vocabularyScore > (prev.vocabulary_score || 0)) {
        areas.push("Better vocabulary range.");
      }
      if (feedback.grammarScore > (prev.grammar_score || 0)) {
        areas.push("Grammar accuracy improved.");
      }
      if (areas.length === 0) {
        areas.push("Consistent performance maintained.");
      }
    }
    return areas;
  };

  const getTaskLabel = () => {
    switch (taskType) {
      case "interview": return "Part 1: Interview";
      case "talk": return "Part 2: Long Turn";
      case "discussion": return "Part 3: Discussion";
    }
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
            Speaking Analyst
          </h1>
          <p className="text-muted-foreground text-sm">
            IELTS Speaking band scoring with detailed examiner feedback
          </p>
        </div>
      </div>

      <TestSessionControls testId={testSessionId} title={topic} onLoad={loadTestById} />

      {/* Zoom Exam Room — Start button */}
      {!zoomMode ? (
        <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/30">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎥</span>
              <div>
                <p className="font-semibold text-foreground">Live IELTS Speaking Exam</p>
                <p className="text-xs text-muted-foreground">Examiner Hannah will greet you and start the interview right away</p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={async () => {
                if (!topic.trim()) await handleGeneratePrompt();
                setZoomMode(true);
              }}
              disabled={isGeneratingPrompt}
              className="gradient-accent text-accent-foreground hover:opacity-90 w-full sm:w-auto"
            >
              {isGeneratingPrompt ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Preparing…</>
              ) : (
                <>▶ Start Exam</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setZoomMode(false)}>
            End exam room
          </Button>
        </div>
      )}

      {zoomMode && (
        <ZoomExamRoom
          topic={topic}
          taskLabel={getTaskLabel()}
          autoSpeakTopic
        />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* Timed Mode Toggle */}
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-primary" />
                  <div>
                    <Label htmlFor="timed-mode" className="font-medium">Timed Practice Mode</Label>
                    <p className="text-xs text-muted-foreground">Simulate real IELTS test conditions</p>
                  </div>
                </div>
                <Switch
                  id="timed-mode"
                  checked={timedMode}
                  onCheckedChange={setTimedMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Practice Timer */}
          {timedMode && (
            <PracticeTimer 
              taskType={taskType} 
              onTimeUp={() => toast.info("Time's up! Submit your response now.")}
            />
          )}

          {/* Task Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Task Type
            </label>
            <TaskSelector
              type="speaking"
              selectedTask={taskType}
              onSelectTask={setTaskType}
            />
          </div>

          {/* Topic/Question */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                {taskType === "talk" ? "Cue Card" : "Question/Topic"}
              </label>
              <div className="flex items-center gap-2">
                <ExaminerVoice
                  text={topic}
                  label="Examiner"
                />
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
            </div>
            {/* Examiner avatar — gives a Zoom-call exam feel */}
            {topic && (
              <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
                <div className="relative">
                  <img
                    src={examinerImg}
                    alt="Your IELTS examiner"
                    width={56}
                    height={56}
                    loading="lazy"
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-background" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">Examiner Hannah</p>
                  <p className="text-xs text-muted-foreground truncate">Cambridge-trained • British English • {getTaskLabel()}</p>
                </div>
              </div>
            )}
            {taskType === "talk" && topic ? (
              <div className="rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-4 font-serif whitespace-pre-wrap text-sm leading-relaxed">
                {hideTopicWhileSpeaking ? (
                  <span className="italic text-muted-foreground">Cue card hidden — rely on your notes, just like the real exam.</span>
                ) : (
                  topic
                )}
              </div>
            ) : (
              <Textarea
                placeholder="Click 'Generate' for a question, or enter your own..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={`bg-card resize-none ${taskType === "talk" ? "min-h-[120px]" : "min-h-[60px]"}`}
              />
            )}
            {taskType === "talk" && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    📝 Prep Notes (1 min)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideTopicWhileSpeaking}
                      onChange={(e) => setHideTopicWhileSpeaking(e.target.checked)}
                      className="accent-primary"
                    />
                    Hide cue card while speaking
                  </label>
                </div>
                <Textarea
                  placeholder="Jot down quick bullet points: where • when • who • why..."
                  value={cueNotes}
                  onChange={(e) => setCueNotes(e.target.value)}
                  className="min-h-[80px] bg-secondary/20 resize-none font-mono text-xs"
                />
              </div>
            )}
          </div>
          
          {/* Voice Recorder */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              🎙️ Record Your Voice
            </label>
            <VoiceRecorder 
              transcript={transcript} 
              onTranscriptChange={setTranscript} 
            />
          </div>
          
          {/* Transcript */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                Your Transcript
              </label>
              <span className="text-sm text-muted-foreground">
                {wordCount} words
              </span>
            </div>
            <Textarea
              placeholder="Click the microphone to start recording, or paste your transcript here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[150px] bg-card resize-none"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={!transcript.trim() || isLoading}
            className="w-full gradient-accent text-accent-foreground hover:opacity-90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Analyze {getTaskLabel()}
              </>
            )}
          </Button>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Speak naturally and include pauses, hesitation and self-correction for accurate IELTS Speaking analysis.
            </span>
          </div>
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
                  type="speaking"
                />
              )}

              {/* Dual Score Display */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    🎙️ Overall Grade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-around mb-4">
                    <DualScoreDisplay 
                      bandScore={feedback.bandScore} 
                      size="lg" 
                    />
                    <div className="space-y-3">
                      <ScoreDisplay score={feedback.fluencyScore} label="Fluency" size="sm" />
                      <ScoreDisplay score={feedback.vocabularyScore} label="Vocabulary" size="sm" />
                      <ScoreDisplay score={feedback.grammarScore} label="Grammar" size="sm" />
                      {feedback.spatialLanguageScore && (
                        <ScoreDisplay score={feedback.spatialLanguageScore} label="Spatial" size="sm" />
                      )}
                      {feedback.coherenceScore && (
                        <ScoreDisplay score={feedback.coherenceScore} label="Coherence" size="sm" />
                      )}
                      {feedback.analyticalScore && (
                        <ScoreDisplay score={feedback.analyticalScore} label="Analysis" size="sm" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">{feedback.scoreJustification}</p>
                </CardContent>
              </Card>

              {/* Transcript Review */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">📝 Transcript Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <blockquote className="border-l-4 border-primary pl-4 text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {feedback.transcriptWithHighlights.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
                      const m = part.match(/^\*\*([^*]+)\*\*$/);
                      return m ? (
                        <strong key={i} className="text-destructive">{m[1]}</strong>
                      ) : (
                        <span key={i}>{part}</span>
                      );
                    })}
                  </blockquote>
                </CardContent>
              </Card>

              {/* Task-Specific Analysis */}
              {feedback.prepositionAnalysis && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">📍 Spatial Language Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Prepositions Used:</p>
                      <div className="flex flex-wrap gap-1">
                        {feedback.prepositionAnalysis.used.map((p, i) => (
                          <Badge key={i} className="bg-success/10 text-success">{p}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Could Have Used:</p>
                      <div className="flex flex-wrap gap-1">
                        {feedback.prepositionAnalysis.missing.map((p, i) => (
                          <Badge key={i} variant="outline">{p}</Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{feedback.prepositionAnalysis.feedback}</p>
                  </CardContent>
                </Card>
              )}

              {feedback.topicCoverage && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">📋 Topic Coverage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-success mb-1">✓ Covered:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {feedback.topicCoverage.covered.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    {feedback.topicCoverage.missed.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-destructive mb-1">✗ Missed:</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {feedback.topicCoverage.missed.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">{feedback.topicCoverage.feedback}</p>
                  </CardContent>
                </Card>
              )}

              {feedback.argumentAnalysis && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">💭 Argument Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-success mb-1">Strengths:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {feedback.argumentAnalysis.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-accent mb-1">Areas to Improve:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {feedback.argumentAnalysis.weaknesses.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-sm text-muted-foreground">{feedback.argumentAnalysis.feedback}</p>
                  </CardContent>
                </Card>
              )}

              {/* Fluency Analysis */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-destructive" />
                    Fluency Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedback.fillerWords.length > 0 ? (
                    feedback.fillerWords.map((filler, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                        <Badge variant="destructive" className="font-mono">
                          "{filler.word}" × {filler.count}
                        </Badge>
                        <p className="text-sm text-muted-foreground flex-1">
                          {filler.suggestion}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Great fluency! No significant filler words.</p>
                  )}
                </CardContent>
              </Card>

              {/* Vocabulary Upgrades */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">📚 Vocabulary Upgrades</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedback.vocabularyUpgrades.map((vocab, index) => (
                    <div key={index} className="p-3 rounded-lg bg-secondary/50 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-muted-foreground">
                          "{vocab.original}"
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge className="font-mono bg-primary/10 text-primary">
                          "{vocab.upgrade}"
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground italic pl-1">
                        {vocab.example}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Grammar Corrections */}
              <CorrectionTable 
                items={feedback.grammarCorrections} 
                title="Grammar Corrections" 
              />

              {/* Native Model Answer */}
              <ModelAnswer answer={feedback.nativeUpgrade} level="Band 8+" />

              {/* Daily Practice Tip */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Daily Practice Tip
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground text-sm">{feedback.dailyPracticeTip}</p>
                </CardContent>
              </Card>

              {/* Overall Feedback */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">📊 Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feedback.overallFeedback}</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] rounded-xl border border-dashed border-border bg-secondary/30">
              <div className="text-center text-muted-foreground">
                <MicIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Submit your transcript to see detailed analysis</p>
                <p className="text-xs mt-2">Includes IELTS band, examiner feedback, and a Band 8+ model answer</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
