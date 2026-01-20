import { cn } from "@/lib/utils";

interface ScoreDisplayProps {
  score: number;
  maxScore?: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

export function ScoreDisplay({ score, maxScore = 9, label, size = "md" }: ScoreDisplayProps) {
  const percentage = (score / maxScore) * 100;
  
  const getScoreColor = () => {
    if (percentage >= 80) return "text-success";
    if (percentage >= 60) return "text-primary";
    if (percentage >= 40) return "text-accent";
    return "text-destructive";
  };

  const sizeClasses = {
    sm: "w-16 h-16 text-xl",
    md: "w-24 h-24 text-3xl",
    lg: "w-32 h-32 text-4xl",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "relative rounded-full bg-secondary flex items-center justify-center font-display font-bold",
          sizeClasses[size],
          getScoreColor()
        )}
      >
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.83} 283`}
            className="opacity-30"
          />
        </svg>
        {score.toFixed(1)}
      </div>
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
