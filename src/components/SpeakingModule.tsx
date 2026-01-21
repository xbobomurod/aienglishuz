import { useState } from "react";
import { Send, Loader2, ArrowLeft, Volume2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScoreDisplay } from "./ScoreDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoiceRecorder } from "./VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
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
  transcriptWithHighlights: string;
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
    explanation: string;
  }>;
  nativeUpgrade: string;
  dailyPracticeTip: string;
  overallFeedback: string;
}

export function SpeakingModule({ onBack }: SpeakingModuleProps) {
  const [topic, setTopic] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);

  const handleSubmit = async () => {
    if (!transcript.trim()) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-speaking', {
        body: { transcript, topic: topic || undefined }
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
      toast.success(`Speaking analyzed! Band Score: ${data.bandScore}`);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

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
            Paste your speaking transcript for detailed analysis
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Speaking Topic (optional)
            </label>
            <Input
              placeholder="e.g., 'Describe a memorable trip you took'"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-card"
            />
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
              placeholder="Click the microphone to start recording, or paste your transcript here. Include all filler words (um, uh, like) for accurate analysis..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[200px] bg-card resize-none"
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
                Analyze Speech
              </>
            )}
          </Button>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Tip: The voice recorder captures filler words naturally. Speak as you would in a real IELTS test!</span>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="space-y-4">
          {feedback ? (
            <>
              {/* Score Overview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    🎙️ Estimated Band Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-around mb-4">
                    <ScoreDisplay score={feedback.bandScore} label="Overall" size="lg" />
                    <div className="space-y-3">
                      <ScoreDisplay score={feedback.fluencyScore} label="Fluency" size="sm" />
                      <ScoreDisplay score={feedback.vocabularyScore} label="Vocabulary" size="sm" />
                      <ScoreDisplay score={feedback.grammarScore} label="Grammar" size="sm" />
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
                  <blockquote className="border-l-4 border-primary pl-4 text-muted-foreground text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: feedback.transcriptWithHighlights.replace(/\*\*(.*?)\*\*/g, '<strong class="text-destructive">$1</strong>') 
                    }} 
                  />
                </CardContent>
              </Card>

              {/* Performance Breakdown - Fluency */}
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
                    <p className="text-sm text-muted-foreground">Great job! No significant filler words detected.</p>
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">✏️ Grammar Corrections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedback.grammarCorrections.length > 0 ? (
                    feedback.grammarCorrections.map((grammar, index) => (
                      <div key={index} className="p-3 rounded-lg bg-secondary/50 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="destructive" className="font-mono line-through">
                            {grammar.mistake}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge className="font-mono bg-success/10 text-success">
                            {grammar.correction}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground pl-1">
                          {grammar.explanation}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Excellent grammar! No corrections needed.</p>
                  )}
                </CardContent>
              </Card>

              {/* Native Upgrade */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-success/10 text-success text-xs font-bold">
                      Native
                    </span>
                    The "Native" Upgrade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed italic">
                    "{feedback.nativeUpgrade}"
                  </p>
                </CardContent>
              </Card>

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
