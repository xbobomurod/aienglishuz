import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic, 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Trophy,
  ChevronRight,
  Pause,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { MockReadingSection } from "./mock-test/MockReadingSection";
import { MockListeningSection } from "./mock-test/MockListeningSection";
import { MockWritingSection } from "./mock-test/MockWritingSection";
import { MockSpeakingSection } from "./mock-test/MockSpeakingSection";

interface MockTestModuleProps {
  onBack: () => void;
}

type TestSection = "intro" | "listening" | "reading" | "writing" | "speaking" | "results";

interface SectionConfig {
  id: TestSection;
  title: string;
  icon: React.ElementType;
  duration: number;
  description: string;
}

interface SectionResult {
  section: TestSection;
  bandScore: number;
  completed: boolean;
  timeTaken: number;
}

const SECTIONS: SectionConfig[] = [
  { 
    id: "listening", 
    title: "Listening", 
    icon: Headphones, 
    duration: 30 * 60,
    description: "Listen to audio recordings and answer questions"
  },
  { 
    id: "reading", 
    title: "Reading", 
    icon: BookOpen, 
    duration: 60 * 60,
    description: "Read passages and answer comprehension questions"
  },
  { 
    id: "writing", 
    title: "Writing", 
    icon: PenTool, 
    duration: 60 * 60,
    description: "Complete Task 1 and Task 2 essays"
  },
  { 
    id: "speaking", 
    title: "Speaking", 
    icon: Mic, 
    duration: 14 * 60,
    description: "Answer interview questions and give a talk"
  },
];

const TOTAL_DURATION = SECTIONS.reduce((acc, s) => acc + s.duration, 0);

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  return `${mins} min`;
}

function getBandColor(band: number): string {
  if (band >= 7.5) return "text-success";
  if (band >= 6.0) return "text-primary";
  if (band >= 5.0) return "text-accent";
  return "text-destructive";
}

function getCefrFromBand(band: number): string {
  if (band >= 8.5) return "C2";
  if (band >= 7.0) return "C1";
  if (band >= 5.5) return "B2";
  if (band >= 4.0) return "B1";
  return "A2";
}

export function MockTestModule({ onBack }: MockTestModuleProps) {
  const [currentSection, setCurrentSection] = useState<TestSection>("intro");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [results, setResults] = useState<SectionResult[]>([]);
  const [sectionStartTime, setSectionStartTime] = useState<number | null>(null);
  const [totalElapsed, setTotalElapsed] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSectionTimeout();
            return 0;
          }
          return prev - 1;
        });
        setTotalElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, timeRemaining]);

  const handleSectionTimeout = useCallback(() => {
    toast.warning("Time's up for this section!");
    handleCompleteSection(5.0, true); // Default score on timeout
  }, [currentSectionIndex]);

  const startTest = () => {
    setCurrentSection("listening");
    setCurrentSectionIndex(0);
    setTimeRemaining(SECTIONS[0].duration);
    setSectionStartTime(Date.now());
    setIsRunning(true);
    setIsPaused(false);
    setResults([]);
    setTotalElapsed(0);
    toast.success("Mock test started! Good luck!");
  };

  const handleCompleteSection = useCallback((bandScore: number, timedOut = false) => {
    const timeTaken = sectionStartTime 
      ? Math.floor((Date.now() - sectionStartTime) / 1000)
      : SECTIONS[currentSectionIndex].duration;

    const result: SectionResult = {
      section: SECTIONS[currentSectionIndex].id,
      bandScore: timedOut ? Math.max(3.0, bandScore) : bandScore,
      completed: !timedOut,
      timeTaken,
    };

    setResults((prev) => [...prev, result]);

    // Move to next section or finish
    if (currentSectionIndex < SECTIONS.length - 1) {
      const nextIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIndex);
      setCurrentSection(SECTIONS[nextIndex].id);
      setTimeRemaining(SECTIONS[nextIndex].duration);
      setSectionStartTime(Date.now());
      toast.info(`Moving to ${SECTIONS[nextIndex].title} section`);
    } else {
      // Test complete
      setCurrentSection("results");
      setIsRunning(false);
      toast.success("Mock test completed!");
    }
  }, [currentSectionIndex, sectionStartTime]);

  const togglePause = () => {
    setIsPaused((prev) => !prev);
    if (isPaused) {
      toast.info("Test resumed");
    } else {
      toast.info("Test paused");
    }
  };

  const calculateOverallBand = (): number => {
    if (results.length === 0) return 0;
    const total = results.reduce((acc, r) => acc + r.bandScore, 0);
    const avg = total / results.length;
    return Math.round(avg * 2) / 2;
  };

  const getProgressPercentage = (): number => {
    const completedDuration = SECTIONS.slice(0, currentSectionIndex)
      .reduce((acc, s) => acc + s.duration, 0);
    const currentProgress = SECTIONS[currentSectionIndex]
      ? SECTIONS[currentSectionIndex].duration - timeRemaining
      : 0;
    return ((completedDuration + currentProgress) / TOTAL_DURATION) * 100;
  };

  // Intro Screen
  if (currentSection === "intro") {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>

        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Trophy className="w-4 h-4" />
            Full IELTS Mock Test
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Complete IELTS Simulation
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Experience a full IELTS test with official timing. Complete all 4 sections 
            to receive your overall band score estimate.
          </p>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Test Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {SECTIONS.map((section, index) => (
                <div 
                  key={section.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{section.title}</span>
                      <Badge variant="secondary">{formatDuration(section.duration)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground/50">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div>
                <p className="font-semibold text-foreground">Total Test Duration</p>
                <p className="text-sm text-muted-foreground">
                  Approximately {Math.round(TOTAL_DURATION / 60)} minutes
                </p>
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatTime(TOTAL_DURATION)}
              </div>
            </div>

            <div className="pt-4">
              <Button 
                onClick={startTest} 
                className="w-full gap-2"
                size="lg"
              >
                <Play className="w-5 h-5" />
                Start Mock Test
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                You can pause the test at any time
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results Screen
  if (currentSection === "results") {
    const overallBand = calculateOverallBand();
    const cefr = getCefrFromBand(overallBand);

    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>

        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Test Completed
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Your Mock Test Results
          </h1>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-6 space-y-6">
            {/* Overall Score */}
            <div className="text-center p-8 rounded-xl bg-gradient-to-br from-primary/10 via-accent/5 to-success/10 border border-border/50">
              <p className="text-sm text-muted-foreground mb-2">Overall Band Score</p>
              <div className={`text-6xl font-bold ${getBandColor(overallBand)}`}>
                {overallBand.toFixed(1)}
              </div>
              <Badge className="mt-3" variant="secondary">
                CEFR Level: {cefr}
              </Badge>
              <p className="text-sm text-muted-foreground mt-4">
                Total time: {formatTime(totalElapsed)} / {formatTime(TOTAL_DURATION)}
              </p>
            </div>

            {/* Section Breakdown */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Section Breakdown</h3>
              {results.map((result) => {
                const section = SECTIONS.find(s => s.id === result.section);
                if (!section) return null;
                
                return (
                  <div 
                    key={result.section}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <section.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{section.title}</span>
                        {result.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Completed in {formatTime(result.timeTaken)}
                      </p>
                    </div>
                    <div className={`text-2xl font-bold ${getBandColor(result.bandScore)}`}>
                      {result.bandScore.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={onBack} variant="outline" className="flex-1 gap-2">
                <ArrowLeft className="w-4 h-4" />
                Return Home
              </Button>
              <Button onClick={startTest} className="flex-1 gap-2">
                <RotateCcw className="w-4 h-4" />
                Retake Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active Test Section
  const currentSectionConfig = SECTIONS[currentSectionIndex];
  const isLowTime = timeRemaining < 300;
  const isCriticalTime = timeRemaining < 60;

  const renderActiveSection = () => {
    switch (currentSection) {
      case "listening":
        return (
          <MockListeningSection
            onComplete={handleCompleteSection}
            isPaused={isPaused}
          />
        );
      case "reading":
        return (
          <MockReadingSection
            onComplete={handleCompleteSection}
            isPaused={isPaused}
          />
        );
      case "writing":
        return (
          <MockWritingSection
            onComplete={handleCompleteSection}
            isPaused={isPaused}
          />
        );
      case "speaking":
        return (
          <MockSpeakingSection
            onComplete={handleCompleteSection}
            isPaused={isPaused}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Progress Bar */}
      <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-sm py-3 px-4 rounded-xl border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <currentSectionConfig.icon className="w-3 h-3" />
              {currentSectionConfig.title}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Section {currentSectionIndex + 1} of {SECTIONS.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isCriticalTime 
                ? "bg-destructive/10 text-destructive animate-pulse" 
                : isLowTime 
                  ? "bg-accent/10 text-accent"
                  : "bg-muted"
            }`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={togglePause}
              className="gap-1"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? "Resume" : "Pause"}
            </Button>
          </div>
        </div>
        <Progress value={getProgressPercentage()} className="h-2" />
      </div>

      {/* Pause Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <Pause className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Test Paused</h2>
              <p className="text-muted-foreground mb-6">
                Your progress has been saved. Click resume to continue.
              </p>
              <div className="flex gap-3">
                <Button onClick={onBack} variant="outline" className="flex-1">
                  Exit Test
                </Button>
                <Button onClick={togglePause} className="flex-1 gap-2">
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section Content */}
      {renderActiveSection()}
    </div>
  );
}
