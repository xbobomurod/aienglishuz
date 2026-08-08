import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const DATE_KEY = "ielts:exam-date";
const BAND_KEY = "ielts:target-band";

const bands = ["6.0", "6.5", "7.0", "7.5", "8.0"];

export function ExamCountdownCard() {
  const [examDate, setExamDate] = useState<string>("");
  const [targetBand, setTargetBand] = useState<string>("7.0");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem(DATE_KEY) || "";
    const b = localStorage.getItem(BAND_KEY) || "7.0";
    setExamDate(d);
    setTargetBand(b);
    if (!d) setEditing(true);
  }, []);

  const save = (date: string, band: string) => {
    setExamDate(date);
    setTargetBand(band);
    localStorage.setItem(DATE_KEY, date);
    localStorage.setItem(BAND_KEY, band);
  };

  const daysLeft = useMemo(() => {
    if (!examDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${examDate}T00:00:00`);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }, [examDate]);

  const plan = useMemo(() => {
    if (daysLeft === null) return null;
    if (daysLeft < 0) return { intensity: "Exam passed", detail: "Set a new date to keep training." };
    if (daysLeft <= 7) return { intensity: "Final sprint", detail: "1 full mock + 1 timed skill every day." };
    if (daysLeft <= 30) return { intensity: "Intensive", detail: "2 skills per day, 1 full mock each week." };
    if (daysLeft <= 90) return { intensity: "Steady build", detail: "1 skill per day, 1 mock every 2 weeks." };
    return { intensity: "Foundation", detail: "4 sessions per week + vocabulary review." };
  }, [daysLeft]);

  return (
    <Card className="border-border bg-card shadow-soft">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground sm:text-lg">Exam countdown</h3>
          </div>
          {examDate && !editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exam date</label>
              <Input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target band</label>
              <div className="flex flex-wrap gap-2">
                {bands.map((b) => (
                  <Button
                    key={b}
                    size="sm"
                    variant={targetBand === b ? "default" : "outline"}
                    onClick={() => setTargetBand(b)}
                  >
                    {b}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                disabled={!examDate}
                onClick={() => {
                  save(examDate, targetBand);
                  setEditing(false);
                }}
              >
                Save
              </Button>
              {examDate && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <p className="font-display text-4xl font-bold leading-none text-primary">
                {daysLeft !== null && daysLeft >= 0 ? daysLeft : 0}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">days left</p>
            </div>
            <div className="flex-1 min-w-[180px] rounded-xl border border-border bg-secondary/50 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{plan?.intensity}</Badge>
                <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  <Target className="h-3.5 w-3.5 text-accent" /> Band {targetBand}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{plan?.detail}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
