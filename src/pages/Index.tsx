import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeModule } from "@/components/HomeModule";
import { WritingModule } from "@/components/WritingModule";
import { SpeakingModule } from "@/components/SpeakingModule";
import { BookOpen, PenTool, Mic, LogOut, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Module = "home" | "writing" | "speaking";

const Index = () => {
  const [activeModule, setActiveModule] = useState<Module>("home");
  const { user, isLoading, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleSelectModule = (module: "writing" | "speaking") => {
    setActiveModule(module);
  };

  const handleBack = () => {
    setActiveModule("home");
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const userEmail = user?.email || "";
  const userInitial = userEmail.charAt(0).toUpperCase();

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

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="truncate">{userEmail}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
