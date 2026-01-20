import { useState } from "react";
import { Send, Loader2, ArrowLeft, Volume2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScoreDisplay } from "./ScoreDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SpeakingModuleProps {
  onBack: () => void;
}

interface SpeakingFeedback {
  bandScore: number;
  fluencyScore: number;
  vocabularyScore: number;
  grammarScore: number;
  fillerWords: Array<{
    word: string;
    count: number;
    suggestion: string;
  }>;
  idioms: string[];
  modelAnswer: string;
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
              placeholder="Paste the transcript of your speaking response here. Include all filler words (um, uh, like) exactly as you spoke them for accurate analysis..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[300px] bg-card resize-none"
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
            <span>Tip: Include all filler words and hesitations in your transcript for the most accurate fluency analysis.</span>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="space-y-4">
          {feedback ? (
            <>
              {/* Score Overview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Estimated Band Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-around">
                    <ScoreDisplay score={feedback.bandScore} label="Overall" size="lg" />
                    <div className="space-y-3">
                      <ScoreDisplay score={feedback.fluencyScore} label="Fluency" size="sm" />
                      <ScoreDisplay score={feedback.vocabularyScore} label="Vocabulary" size="sm" />
                      <ScoreDisplay score={feedback.grammarScore} label="Grammar" size="sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filler Words */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-destructive" />
                    Filler Word Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedback.fillerWords.map((filler, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <Badge variant="destructive" className="font-mono">
                        "{filler.word}" × {filler.count}
                      </Badge>
                      <p className="text-sm text-muted-foreground flex-1">
                        {filler.suggestion}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Idiomatic Suggestions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Suggested Idioms</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feedback.idioms.map((idiom, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground">{idiom}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Model Answer */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-success/10 text-success text-xs font-bold">
                      Band 9.0
                    </span>
                    Model Answer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed italic">
                    "{feedback.modelAnswer}"
                  </p>
                </CardContent>
              </Card>

              {/* Overall Feedback */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Summary</CardTitle>
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
