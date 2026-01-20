import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeModule } from "@/components/HomeModule";
import { WritingModule } from "@/components/WritingModule";
import { SpeakingModule } from "@/components/SpeakingModule";
import { BookOpen, PenTool, Mic } from "lucide-react";

type Module = "home" | "writing" | "speaking";

const Index = () => {
  const [activeModule, setActiveModule] = useState<Module>("home");

  const handleSelectModule = (module: "writing" | "speaking") => {
    setActiveModule(module);
  };

  const handleBack = () => {
    setActiveModule("home");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              EnglishPro
            </span>
          </div>

          <Tabs value={activeModule} onValueChange={(v) => setActiveModule(v as Module)}>
            <TabsList className="hidden sm:flex">
              <TabsTrigger value="home" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Home
              </TabsTrigger>
              <TabsTrigger value="writing" className="gap-2">
                <PenTool className="w-4 h-4" />
                Writing
              </TabsTrigger>
              <TabsTrigger value="speaking" className="gap-2">
                <Mic className="w-4 h-4" />
                Speaking
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {activeModule === "home" && (
          <HomeModule onSelectModule={handleSelectModule} />
        )}
        {activeModule === "writing" && (
          <WritingModule onBack={handleBack} />
        )}
        {activeModule === "speaking" && (
          <SpeakingModule onBack={handleBack} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          <p>AI-powered feedback using IELTS/CEFR standards</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
