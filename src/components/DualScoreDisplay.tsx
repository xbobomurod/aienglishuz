import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DualScoreDisplayProps {
  bandScore: number;
  cefrLevel: string;
  size?: "sm" | "lg";
}

export function DualScoreDisplay({ bandScore, cefrLevel, size = "lg" }: DualScoreDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 7) return "text-success";
    if (score >= 5) return "text-accent";
    return "text-destructive";
  };

  const getCefrColor = (level: string) => {
    switch (level) {
      case "C2": return "bg-success/10 text-success border-success/30";
      case "C1": return "bg-primary/10 text-primary border-primary/30";
      case "B2": return "bg-accent/10 text-accent border-accent/30";
      case "B1": return "bg-muted text-muted-foreground border-muted-foreground/30";
      default: return "bg-destructive/10 text-destructive border-destructive/30";
    }
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
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-muted-foreground",
          size === "lg" ? "text-sm" : "text-xs"
        )}>
          IELTS
        </span>
        <Badge 
          variant="outline" 
          className={cn(
            "font-bold",
            getCefrColor(cefrLevel),
            size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5"
          )}
        >
          {cefrLevel}
        </Badge>
      </div>
      <span className={cn(
        "text-muted-foreground",
        size === "lg" ? "text-xs" : "text-[10px]"
      )}>
        CEFR Level
      </span>
    </div>
  );
}
