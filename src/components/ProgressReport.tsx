import { TrendingUp, TrendingDown, Minus, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProgressReportProps {
  currentScore: number;
  previousScore: number | null;
  taskId: string;
  improvementAreas?: string[];
  type: "writing" | "speaking";
}

export function ProgressReport({ 
  currentScore, 
  previousScore, 
  taskId,
  improvementAreas = [],
  type
}: ProgressReportProps) {
  const scoreDiff = previousScore ? currentScore - previousScore : 0;
  const isImproved = scoreDiff > 0;
  const isDeclined = scoreDiff < 0;
  
  const getScoreColor = (score: number) => {
    if (score >= 7) return "text-success";
    if (score >= 5) return "text-accent";
    return "text-destructive";
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">📈</span>
          Progress Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Comparison */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Score</p>
            <p className={`text-3xl font-bold ${getScoreColor(currentScore)}`}>
              {currentScore}/9.0
            </p>
          </div>
          
          {previousScore !== null ? (
            <div className="flex items-center gap-2">
              {isImproved ? (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-success/10 text-success">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">+{scoreDiff.toFixed(1)}</span>
                </div>
              ) : isDeclined ? (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-semibold">{scoreDiff.toFixed(1)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                  <Minus className="w-4 h-4" />
                  <span className="font-semibold">No change</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              <Award className="w-4 h-4" />
              <span className="font-semibold">First Attempt!</span>
            </div>
          )}
        </div>

        {/* Previous Score */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Previous Score:</span>
          <span className="font-medium">
            {previousScore !== null ? `${previousScore}/9.0` : "First Attempt"}
          </span>
        </div>

        {/* Improvement Areas */}
        {improvementAreas.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-sm font-medium text-foreground mb-2">Improvement Areas:</p>
            <ul className="space-y-1">
              {improvementAreas.map((area, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* History Sync */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">🗂️ History Sync</p>
            <p className="text-sm font-medium text-primary">Task ID: {taskId.slice(0, 8)}...</p>
          </div>
          <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">
            ✓ Saved to Dashboard
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
