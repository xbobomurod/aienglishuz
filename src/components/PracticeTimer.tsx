import { useState, useEffect, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PracticeTimerProps {
  taskType: "interview" | "picture" | "talk" | "discussion";
  onTimeUp?: () => void;
  onStart?: () => void;
  isActive?: boolean;
}

// IELTS Speaking test timing (in seconds)
const TASK_DURATIONS: Record<string, number> = {
  interview: 300, // 5 minutes (Part 1)
  picture: 120, // 2 minutes (Picture description)
  talk: 120, // 2 minutes (Part 2 - Long turn, after 1 min prep)
  discussion: 300, // 5 minutes (Part 3)
};

const PREP_TIMES: Record<string, number> = {
  interview: 0,
  picture: 30, // 30 seconds to look at image
  talk: 60, // 1 minute prep time
  discussion: 0,
};

const TASK_LABELS = {
  interview: "Part 1: Interview",
  picture: "Picture Description",
  talk: "Part 2: Long Turn",
  discussion: "Part 3: Discussion",
} as const;

export function PracticeTimer({ taskType, onTimeUp, onStart, isActive = false }: PracticeTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPrepPhase, setIsPrepPhase] = useState(PREP_TIMES[taskType] > 0);
  const [timeRemaining, setTimeRemaining] = useState<number>(
    PREP_TIMES[taskType] > 0 ? PREP_TIMES[taskType] : TASK_DURATIONS[taskType]
  );

  const totalTime = isPrepPhase ? PREP_TIMES[taskType] : TASK_DURATIONS[taskType];
  const progress = ((totalTime - timeRemaining) / totalTime) * 100;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = useCallback(() => {
    setIsRunning(true);
    onStart?.();
  }, [onStart]);

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPrepPhase(PREP_TIMES[taskType] > 0);
    setTimeRemaining(
      PREP_TIMES[taskType] > 0 ? PREP_TIMES[taskType] : TASK_DURATIONS[taskType]
    );
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeRemaining === 0) {
      if (isPrepPhase) {
        // Transition from prep to speaking phase
        setIsPrepPhase(false);
        setTimeRemaining(TASK_DURATIONS[taskType]);
      } else {
        // Time's up
        setIsRunning(false);
        onTimeUp?.();
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, isPrepPhase, taskType, onTimeUp]);

  // Reset timer when task type changes
  useEffect(() => {
    handleReset();
  }, [taskType]);

  const isLowTime = timeRemaining <= 30;
  const isCriticalTime = timeRemaining <= 10;

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      isRunning && isCriticalTime && "border-destructive animate-pulse",
      isRunning && isLowTime && !isCriticalTime && "border-accent",
      !isRunning && "border-border"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer className={cn(
              "w-5 h-5",
              isRunning && isCriticalTime && "text-destructive",
              isRunning && isLowTime && !isCriticalTime && "text-accent",
              !isRunning && "text-primary"
            )} />
            <span className="font-medium text-sm">{TASK_LABELS[taskType]}</span>
          </div>
          <Badge variant={isPrepPhase ? "secondary" : "default"}>
            {isPrepPhase ? "Preparation" : "Speaking"}
          </Badge>
        </div>

        {/* Timer Display */}
        <div className="text-center mb-4">
          <div className={cn(
            "text-4xl font-mono font-bold transition-colors",
            isRunning && isCriticalTime && "text-destructive",
            isRunning && isLowTime && !isCriticalTime && "text-accent"
          )}>
            {formatTime(timeRemaining)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isPrepPhase 
              ? "Time to prepare your answer" 
              : "Speak until the timer ends"}
          </p>
        </div>

        {/* Progress Bar */}
        <Progress 
          value={progress} 
          className={cn(
            "h-2 mb-4",
            isRunning && isCriticalTime && "[&>div]:bg-destructive",
            isRunning && isLowTime && !isCriticalTime && "[&>div]:bg-accent"
          )}
        />

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="gap-2">
              <Play className="w-4 h-4" />
              {timeRemaining === (isPrepPhase ? PREP_TIMES[taskType] : TASK_DURATIONS[taskType])
                ? "Start Timer"
                : "Resume"}
            </Button>
          ) : (
            <Button onClick={handlePause} variant="secondary" className="gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </Button>
          )}
          <Button onClick={handleReset} variant="outline" size="icon">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Warning for low time */}
        {isRunning && isLowTime && (
          <div className={cn(
            "flex items-center gap-2 mt-3 p-2 rounded-lg text-sm",
            isCriticalTime ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
          )}>
            <AlertCircle className="w-4 h-4" />
            <span>
              {isCriticalTime 
                ? "Time almost up! Wrap up your answer." 
                : "Less than 30 seconds remaining."}
            </span>
          </div>
        )}

        {/* Task-specific tips */}
        <div className="mt-4 p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground">
            {taskType === "interview" && "Answer 4-5 questions. Aim for 30-60 seconds per response."}
            {taskType === "picture" && "Describe what you see: location, people, objects, actions."}
            {taskType === "talk" && "Cover all points on the cue card. Speak for the full 2 minutes."}
            {taskType === "discussion" && "Give detailed answers. Support with examples and reasoning."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
