import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DualScoreDisplayProps {
  bandScore: number;
  size?: "sm" | "lg";
}

export function DualScoreDisplay({ bandScore, size = "lg" }: DualScoreDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 7) return "text-success";
    if (score >= 5) return "text-accent";
    return "text-destructive";
  };

  return (
    <div className={cn(
      "flex flex-col items-center gap-2",
      size === "lg" ? "p-4" : "p-2"
    )}>
      <div className={cn(
        "font-bold",
        size === "lg" ? "text-4xl" : "text-2xl",
        getScoreColor(bandScore)
      )}>
        {bandScore}
      </div>
      <span className={cn(
        "text-muted-foreground",
        size === "lg" ? "text-xs" : "text-[10px]"
      )}>
        IELTS Band Score
      </span>
    </div>
  );
}
