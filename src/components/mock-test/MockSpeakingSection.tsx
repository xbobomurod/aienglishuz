import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Mic, Sparkles, ChevronRight } from "lucide-react";
import { VoiceRecorder } from "../VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MockSpeakingSectionProps {
  onComplete: (bandScore: number) => void;
  isPaused: boolean;
}

interface SpeakingPart {
  id: number;
  title: string;
  duration: string;
  prompt: string;
}

export function MockSpeakingSection({ onComplete, isPaused }: MockSpeakingSectionProps) {
  const { user } = useAuth();
  const [parts, setParts] = useState<SpeakingPart[]>([]);
  const [currentPart, setCurrentPart] = useState(0);
  const [transcripts, setTranscripts] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    generatePrompts();
  }, []);

  const generatePrompts = async () => {
    try {
      const [p1Res, p2Res, p3Res] = await Promise.all([
        supabase.functions.invoke('analyze-speaking', {
          body: { generatePrompt: true, taskType: 'interview' }
        }),
        supabase.functions.invoke('analyze-speaking', {
          body: { generatePrompt: true, taskType: 'talk' }
        }),
        supabase.functions.invoke('analyze-speaking', {
          body: { generatePrompt: true, taskType: 'discussion' }
        })
      ]);

      setParts([
        {
          id: 1,
          title: "Part 1: Introduction & Interview",
          duration: "4-5 min",
          prompt: p1Res.data?.prompt || "Tell me about your hometown. What do you like most about living there?"
        },
        {
          id: 2,
          title: "Part 2: Long Turn (Cue Card)",
          duration: "3-4 min",
          prompt: p2Res.data?.prompt || "Describe a memorable trip you have taken. You should say:\n- Where you went\n- Who you went with\n- What you did there\n- And explain why it was memorable"
        },
        {
          id: 3,
          title: "Part 3: Discussion",
          duration: "4-5 min",
          prompt: p3Res.data?.prompt || "Let's discuss travel and tourism in general. What are the benefits and drawbacks of mass tourism for local communities?"
        }
      ]);
    } catch (err) {
      console.error("Error generating prompts:", err);
      // Fallback prompts
      setParts([
        {
          id: 1,
          title: "Part 1: Introduction & Interview",
          duration: "4-5 min",
          prompt: "Tell me about your hometown. What do you like most about living there?"
        },
        {
          id: 2,
          title: "Part 2: Long Turn (Cue Card)",
          duration: "3-4 min",
          prompt: "Describe a memorable trip you have taken. You should say:\n- Where you went\n- Who you went with\n- What you did there\n- And explain why it was memorable"
        },
        {
          id: 3,
          title: "Part 3: Discussion",
          duration: "4-5 min",
          prompt: "Let's discuss travel and tourism in general. What are the benefits and drawbacks of mass tourism for local communities?"
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPart = () => {
    if (currentPart < parts.length - 1) {
      setCurrentPart(prev => prev + 1);
    }
  };

  const handlePreviousPart = () => {
    if (currentPart > 0) {
      setCurrentPart(prev => prev - 1);
    }
  };

  const submitSpeaking = async () => {
    if (parts.length === 0) return;

    setIsSubmitting(true);

    try {
      const scores: number[] = [];

      for (let i = 0; i < parts.length; i++) {
        const transcript = transcripts[i] || "";
        if (!transcript.trim()) {
          scores.push(4.0);
          continue;
        }

        const { data, error } = await supabase.functions.invoke('analyze-speaking', {
          body: { 
            transcript, 
            topic: parts[i].prompt,
            taskType: i === 0 ? 'interview' : i === 1 ? 'talk' : 'discussion'
          }
        });

        if (error || data.error) {
          scores.push(5.0);
          continue;
        }

        // Save to database
        if (user && data.bandScore) {
          await supabase.from("speaking_evaluations").insert({
            user_id: user.id,
            topic: parts[i].prompt,
            transcript,
            band_score: data.bandScore,
            fluency_score: data.fluencyScore,
            vocabulary_score: data.vocabularyScore,
            grammar_score: data.grammarScore,
            filler_words: data.fillerWords || [],
            vocabulary_upgrades: data.vocabularyUpgrades || [],
            grammar_corrections: data.grammarCorrections || [],
            native_upgrade: data.nativeUpgrade || "",
            daily_practice_tip: data.dailyPracticeTip || "",
            overall_feedback: data.overallFeedback || ""
          } as any);
        }

        scores.push(data.bandScore || 5.0);
      }

      // Calculate average
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const roundedScore = Math.round(avgScore * 2) / 2;

      toast.success(`Speaking completed! Overall Band Score: ${roundedScore}`);
      onComplete(roundedScore);
    } catch (err) {
      console.error("Error submitting speaking:", err);
      toast.error("Failed to submit speaking.");
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
          <p className="text-muted-foreground">Generating your speaking prompts...</p>
        </CardContent>
      </Card>
    );
  }

  if (parts.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-destructive">Failed to load speaking prompts.</p>
          <Button onClick={generatePrompts} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const currentPartData = parts[currentPart];
  const currentTranscript = transcripts[currentPart] || "";
  const wordCount = currentTranscript.trim().split(/\s+/).filter(Boolean).length;
  const totalWords = Object.values(transcripts).reduce(
    (acc, t) => acc + t.trim().split(/\s+/).filter(Boolean).length, 
    0
  );
  const canSubmit = totalWords >= 50;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-accent" />
            IELTS Speaking Test
          </CardTitle>
          <Badge variant="outline">
            Part {currentPart + 1} of {parts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Part Navigation */}
        <div className="flex gap-2">
          {parts.map((part, idx) => (
            <Button
              key={part.id}
              variant={currentPart === idx ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPart(idx)}
              className="flex-1"
              disabled={isPaused}
            >
              Part {idx + 1}
              {transcripts[idx] && <CheckCircle2 className="w-3 h-3 ml-1" />}
            </Button>
          ))}
        </div>

        {/* Current Part */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="font-medium text-sm">{currentPartData.title}</span>
              </div>
              <Badge variant="secondary">{currentPartData.duration}</Badge>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentPartData.prompt}</p>
          </div>

          {/* Voice Recorder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Record Your Response</span>
              <span className="text-sm text-muted-foreground">{wordCount} words</span>
            </div>
            <VoiceRecorder 
              transcript={currentTranscript}
              onTranscriptChange={(text) => setTranscripts(prev => ({ ...prev, [currentPart]: text }))}
            />
          </div>

          {/* Manual Transcript Input */}
          <div>
            <span className="text-sm font-medium block mb-2">Or type your response:</span>
            <Textarea
              placeholder="Type your speaking response here..."
              value={currentTranscript}
              onChange={(e) => setTranscripts(prev => ({ ...prev, [currentPart]: e.target.value }))}
              className="min-h-[150px] resize-none"
              disabled={isPaused}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePreviousPart}
            disabled={currentPart === 0 || isPaused}
            className="flex-1"
          >
            Previous Part
          </Button>
          {currentPart < parts.length - 1 ? (
            <Button
              onClick={handleNextPart}
              disabled={isPaused}
              className="flex-1 gap-2"
            >
              Next Part
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={submitSpeaking}
              disabled={isSubmitting || isPaused || !canSubmit}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Speaking ({totalWords} words)
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
