import { useState } from "react";
import { History, ChevronDown, ChevronUp, PenTool, Mic, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WritingEvaluation, SpeakingEvaluation } from "@/hooks/useEvaluationHistory";
import { format } from "date-fns";

interface EvaluationHistoryProps {
  writingHistory: WritingEvaluation[];
  speakingHistory: SpeakingEvaluation[];
  isLoading: boolean;
  onSelectWriting?: (evaluation: WritingEvaluation) => void;
  onSelectSpeaking?: (evaluation: SpeakingEvaluation) => void;
}

export function EvaluationHistory({
  writingHistory,
  speakingHistory,
  isLoading,
  onSelectWriting,
  onSelectSpeaking
}: EvaluationHistoryProps) {
  const [isWritingOpen, setIsWritingOpen] = useState(false);
  const [isSpeakingOpen, setIsSpeakingOpen] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 7) return "bg-success/10 text-success";
    if (score >= 5) return "bg-accent/10 text-accent";
    return "bg-destructive/10 text-destructive";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading history...
        </CardContent>
      </Card>
    );
  }

  const hasHistory = writingHistory.length > 0 || speakingHistory.length > 0;

  if (!hasHistory) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No evaluation history yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Complete a writing or speaking task to start tracking your progress!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Writing History */}
      {writingHistory.length > 0 && (
        <Collapsible open={isWritingOpen} onOpenChange={setIsWritingOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-secondary/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-primary" />
                    Writing History
                    <Badge variant="secondary">{writingHistory.length}</Badge>
                  </div>
                  {isWritingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2">
                {writingHistory.slice(0, 5).map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => onSelectWriting?.(evaluation)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {evaluation.topic || "Untitled Essay"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(evaluation.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                    <Badge className={getScoreColor(evaluation.band_score)}>
                      {evaluation.band_score}/9
                    </Badge>
                  </div>
                ))}
                {writingHistory.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    + {writingHistory.length - 5} more evaluations
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Speaking History */}
      {speakingHistory.length > 0 && (
        <Collapsible open={isSpeakingOpen} onOpenChange={setIsSpeakingOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-secondary/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-accent" />
                    Speaking History
                    <Badge variant="secondary">{speakingHistory.length}</Badge>
                  </div>
                  {isSpeakingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2">
                {speakingHistory.slice(0, 5).map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => onSelectSpeaking?.(evaluation)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {evaluation.topic || "Untitled Recording"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(evaluation.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                    <Badge className={getScoreColor(evaluation.band_score)}>
                      {evaluation.band_score}/9
                    </Badge>
                  </div>
                ))}
                {speakingHistory.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    + {speakingHistory.length - 5} more evaluations
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
