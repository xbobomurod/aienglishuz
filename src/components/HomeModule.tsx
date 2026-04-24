import { BookOpen, Mic, PenTool, Headphones, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomeModuleProps {
  onSelectModule: (module: "writing" | "speaking" | "reading" | "listening" | "mocktest") => void;
}

const skills = [
  {
    id: "reading" as const,
    letter: "R",
    title: "Reading",
    spec: "3 passages • 40 questions • 60 min",
    icon: BookOpen,
  },
  {
    id: "listening" as const,
    letter: "L",
    title: "Listening",
    spec: "4 sections • 40 questions • 30 min",
    icon: Headphones,
  },
  {
    id: "writing" as const,
    letter: "W",
    title: "Writing",
    spec: "Task 1 + Task 2 • 60 min",
    icon: PenTool,
  },
  {
    id: "speaking" as const,
    letter: "S",
    title: "Speaking",
    spec: "Parts 1–3 • 11–14 min",
    icon: Mic,
  },
];

export function HomeModule({ onSelectModule }: HomeModuleProps) {
  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto px-1 sm:px-4 lg:px-6 py-6 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-20 items-center">
          {/* Editorial copy */}
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-3 px-3 py-1.5 border border-primary/15 rounded-md bg-card shadow-soft mb-6 sm:mb-8">
              <span className="block w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-primary/80">
                Private IELTS Coach
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl text-primary tracking-tight leading-[1.05] mb-5 sm:mb-6 text-balance">
              Secure your Band 8.5
              <br />
              <span className="italic font-normal text-primary/75">with quiet certainty.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[48ch] mb-8 sm:mb-10">
              An elite, AI-driven evaluation calibrated to official IELTS band descriptors.
              Forensic diagnostics across all four skills, delivered instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <Button
                onClick={() => onSelectModule("mocktest")}
                size="lg"
                className="px-6 sm:px-8 py-5 sm:py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-card"
              >
                Commence Mock Test
              </Button>
              <Button
                onClick={() => onSelectModule("writing")}
                variant="outline"
                size="lg"
                className="px-6 sm:px-8 py-5 sm:py-6 border-primary/20 hover:bg-primary/5 text-primary font-medium"
              >
                Refine a Skill
              </Button>
            </div>

            {/* Trust strip */}
            <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-primary/10 w-full grid grid-cols-3 gap-4 sm:gap-12">
              <div className="flex flex-col gap-1">
                <span className="font-display text-xl sm:text-2xl text-primary">100%</span>
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                  Band 9 Rubric
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-display text-xl sm:text-2xl text-primary">Instant</span>
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                  AI Feedback
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-display text-xl sm:text-2xl text-primary">4 / 4</span>
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                  Skill Coverage
                </span>
              </div>
            </div>
          </div>

          {/* Active syllabus card */}
          <div className="relative">
            <div className="bg-card border border-primary/10 rounded-xl p-5 sm:p-8 shadow-elevated">
              <div className="flex justify-between items-end mb-5 sm:mb-6">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-primary uppercase">
                    Active Syllabus
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Select a module to begin.
                  </p>
                </div>
                <span className="px-2 py-1 bg-accent/10 text-accent font-medium text-[10px] sm:text-xs rounded uppercase tracking-wider">
                  Ready
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => onSelectModule(skill.id)}
                    className="group p-4 sm:p-5 rounded-lg border border-primary/10 bg-secondary/50 hover:bg-secondary hover:border-accent/40 transition-colors text-left flex flex-col justify-between aspect-square focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-display text-2xl sm:text-3xl text-primary/30 group-hover:text-accent transition-colors">
                        {skill.letter}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary mb-1 text-sm sm:text-base">
                        {skill.title}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug">
                        {skill.spec}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => onSelectModule("mocktest")}
                className="w-full p-4 rounded-lg bg-primary text-primary-foreground flex items-center justify-between hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold">Full IELTS Mock Test</span>
                  <span className="text-xs text-primary-foreground/70 mt-0.5">
                    2h 45m • All 4 modules • Estimated band score
                  </span>
                </div>
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-foreground/10">
                  <Plus className="w-4 h-4" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
