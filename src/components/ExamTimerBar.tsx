import { Clock, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExamTimerBarProps {
  /** Seconds elapsed (count-up) or remaining (count-down) */
  seconds: number;
  /** Target/limit in seconds. Used for the progress bar and the "/ target" hint. */
  target?: number;
  mode?: "up" | "down";
  label?: string;
  /** Optional right-hand content: word counts, buttons, badges... */
  meta?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export const formatClock = (s: number) => {
  const safe = Math.max(0, Math.floor(s));
  return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, "0")}`;
};

/**
 * Unified exam timer + progress bar used across Reading, Writing and Speaking.
 */
export function ExamTimerBar({
  seconds,
  target,
  mode = "up",
  label = "Time",
  meta,
  className,
  compact = false,
}: ExamTimerBarProps) {
  const ratio = target && target > 0
    ? mode === "up"
      ? Math.min(seconds / target, 1)
      : Math.min(1 - seconds / target, 1)
    : 0;

  const urgent = mode === "down" ? seconds <= 10 : !!target && seconds >= target;
  const warning = !urgent && !!target && ratio >= 0.75;

  const tone = urgent
    ? "text-destructive"
    : warning
      ? "text-accent"
      : "text-primary";

  const barTone = urgent
    ? "bg-destructive"
    : warning
      ? "bg-accent"
      : "bg-primary";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/60 px-3 py-2 shadow-soft",
        compact && "px-2.5 py-1.5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {mode === "down" ? (
            <Timer className={cn("w-3.5 h-3.5 flex-shrink-0", tone)} />
          ) : (
            <Clock className={cn("w-3.5 h-3.5 flex-shrink-0", tone)} />
          )}
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
            {label}
          </span>
          <span className={cn("font-mono text-sm font-semibold tabular-nums", tone)}>
            {formatClock(seconds)}
          </span>
          {target ? (
            <span className="font-mono text-[11px] text-muted-foreground">
              / {formatClock(target)}
            </span>
          ) : null}
        </div>
        {meta ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            {meta}
          </div>
        ) : null}
      </div>
      {target ? (
        <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barTone)}
            style={{ width: `${Math.round(Math.max(0, ratio) * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}