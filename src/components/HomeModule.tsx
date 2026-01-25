import { BookOpen, Mic, PenTool, Sparkles, Headphones, Trophy, Clock } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HomeModuleProps {
  onSelectModule: (module: "writing" | "speaking" | "reading" | "listening" | "mocktest") => void;
}

const dailyChallenges = [
  "Should governments invest more in public transportation or road infrastructure?",
  "What are the advantages and disadvantages of remote work?",
  "How has technology changed the way we communicate?",
  "Is it better to learn from books or from experience?",
];

export function HomeModule({ onSelectModule }: HomeModuleProps) {
  const todayChallenge = dailyChallenges[new Date().getDay() % dailyChallenges.length];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          AI-Powered English Learning
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
          Master Your English Skills
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get instant, detailed feedback on your writing and speaking. Our AI examiner 
          evaluates your work using IELTS/CEFR standards to help you improve faster.
        </p>
      </div>

      {/* Mock Test Feature */}
      <Card className="max-w-5xl mx-auto bg-gradient-to-r from-primary/5 via-accent/5 to-success/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <h3 className="font-display text-xl font-bold text-foreground">Full Mock Test</h3>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  ~2h 45m
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Experience a complete IELTS simulation with official timing. Test all 4 modules 
                and receive your estimated overall band score.
              </p>
            </div>
            <Button 
              onClick={() => onSelectModule("mocktest")}
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Trophy className="w-5 h-5" />
              Start Mock Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module Selection */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        <ModuleCard
          icon={BookOpen}
          title="Reading"
          description="Practice with AI-generated passages and various question types."
          accentColor="success"
          onClick={() => onSelectModule("reading")}
        />
        <ModuleCard
          icon={Headphones}
          title="Listening"
          description="Listen to audio scripts and answer comprehension questions."
          accentColor="accent"
          onClick={() => onSelectModule("listening")}
        />
        <ModuleCard
          icon={PenTool}
          title="Writing"
          description="Submit essays for detailed band scores and improvement tips."
          accentColor="primary"
          onClick={() => onSelectModule("writing")}
        />
        <ModuleCard
          icon={Mic}
          title="Speaking"
          description="Record transcripts for fluency analysis and vocabulary feedback."
          accentColor="accent"
          onClick={() => onSelectModule("speaking")}
        />
      </div>

      {/* Daily Challenge */}
      <div className="max-w-3xl mx-auto">
        <div className="relative p-6 rounded-xl bg-gradient-to-br from-primary/5 via-accent/5 to-success/5 border border-border/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-accent font-semibold mb-3">
              <Sparkles className="w-5 h-5" />
              Daily Challenge
            </div>
            <p className="text-foreground font-medium text-lg mb-4">
              "{todayChallenge}"
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => onSelectModule("writing")}
                className="bg-primary hover:bg-primary/90"
              >
                Write an Essay
              </Button>
              <Button 
                variant="outline"
                onClick={() => onSelectModule("speaking")}
              >
                Practice Speaking
              </Button>
              <Button 
                variant="outline"
                onClick={() => onSelectModule("reading")}
              >
                Try Reading
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="font-display text-2xl font-semibold text-center text-foreground">
          How It Works
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Choose", desc: "Select Writing or Speaking module" },
            { step: "2", title: "Submit", desc: "Enter your essay or transcript" },
            { step: "3", title: "Learn", desc: "Get instant AI feedback & improve" },
          ].map((item) => (
            <div key={item.step} className="text-center p-4">
              <div className="w-10 h-10 rounded-full gradient-hero text-primary-foreground font-bold flex items-center justify-center mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
