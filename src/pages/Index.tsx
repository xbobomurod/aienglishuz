import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeModule } from "@/components/HomeModule";
import { WritingModule } from "@/components/WritingModule";
import { SpeakingModule } from "@/components/SpeakingModule";
import { ReadingModule } from "@/components/ReadingModule";
import { ListeningModule } from "@/components/ListeningModule";
import { MockTestModule } from "@/components/MockTestModule";
import { BookOpen, PenTool, Mic, LogOut, User, Loader2, LayoutDashboard, Headphones, Trophy, Menu, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

type Module = "home" | "writing" | "speaking" | "reading" | "listening" | "mocktest";

const Index = () => {
  const [activeModule, setActiveModule] = useState<Module>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    user,
    isLoading,
    signOut,
    isAuthenticated
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleSelectModule = (module: "writing" | "speaking" | "reading" | "listening" | "mocktest") => {
    setActiveModule(module);
    setMobileMenuOpen(false);
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

  const moduleItems = [
    { id: "home", label: "Home", icon: BookOpen },
    { id: "mocktest", label: "Mock Test", icon: Trophy },
    { id: "reading", label: "Reading", icon: BookOpen },
    { id: "listening", label: "Listening", icon: Headphones },
    { id: "writing", label: "Writing", icon: PenTool },
    { id: "speaking", label: "Speaking", icon: Mic },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14 sm:h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg gradient-hero flex items-center justify-center">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg sm:text-xl font-bold text-foreground">EnglishCoach</span>
          </div>

          {/* Desktop Navigation */}
          <Tabs value={activeModule} onValueChange={(v) => setActiveModule(v as Module)} className="hidden lg:block">
            <TabsList>
              {moduleItems.map((item) => (
                <TabsTrigger key={item.id} value={item.id} className="gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary-foreground" />
                    </div>
                    EnglishCoach
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {moduleItems.map((item) => (
                    <Button
                      key={item.id}
                      variant={activeModule === item.id ? "secondary" : "ghost"}
                      className="justify-start gap-3 h-12"
                      onClick={() => handleSelectModule(item.id as any)}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </DropdownMenuItem>
                <ChangePasswordDialog
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2 cursor-pointer">
                      <KeyRound className="w-4 h-4" />
                      Change Password
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4 sm:py-8 px-4">
        {activeModule === "home" && <HomeModule onSelectModule={handleSelectModule} />}
        {activeModule === "writing" && <WritingModule onBack={handleBack} />}
        {activeModule === "speaking" && <SpeakingModule onBack={handleBack} />}
        {activeModule === "reading" && <ReadingModule onBack={handleBack} />}
        {activeModule === "listening" && <ListeningModule onBack={handleBack} />}
        {activeModule === "mocktest" && <MockTestModule onBack={handleBack} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 sm:py-6 mt-auto">
        <div className="container text-center text-xs sm:text-sm text-muted-foreground px-4">
          <p>Complete IELTS test simulation with AI-powered feedback</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;