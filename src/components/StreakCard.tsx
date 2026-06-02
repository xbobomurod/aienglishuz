import { useState } from "react";
import { Flame, Target, Pencil, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStreak } from "@/hooks/useStreak";

export function StreakCard() {
  const { streak, todayCount, goal, setGoal, loading } = useStreak();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal));

  const pct = Math.min(100, Math.round((todayCount / goal) * 100));
  const reached = todayCount >= goal;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-soft flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <Flame className={`w-6 h-6 ${streak > 0 ? "text-accent" : "text-muted-foreground"}`} />
        </div>
        <div>
          <div className="text-2xl font-display font-bold text-foreground leading-none">
            {loading ? "—" : streak}
          </div>
          <div className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
            Day streak
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Target className="w-3.5 h-3.5" />
            Today
            {reached && <span className="text-accent">• Goal reached!</span>}
          </div>
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                max={20}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-7 w-14 text-xs"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => {
                  setGoal(Number(draft) || goal);
                  setEditing(false);
                }}
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setDraft(String(goal));
                setEditing(true);
              }}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {todayCount}/{goal} tasks <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
        <Progress value={pct} className="h-2" />
      </div>
    </div>
  );
}