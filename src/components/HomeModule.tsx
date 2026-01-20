import { BookOpen, Mic, PenTool, Sparkles } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { Button } from "@/components/ui/button";

interface HomeModuleProps {
  onSelectModule: (module: "writing" | "speaking") => void;
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

      {/* Module Selection */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <ModuleCard
          icon={PenTool}
          title="Writing Examiner"
          description="Submit your essay and receive detailed band scores, error analysis, and suggestions for improvement."
          accentColor="primary"
          onClick={() => onSelectModule("writing")}
        />
        <ModuleCard
          icon={Mic}
          title="Speaking Analyst"
          description="Paste your speaking transcript for filler word analysis, vocabulary suggestions, and a model answer."
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
              <BookOpen className="w-5 h-5" />
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
