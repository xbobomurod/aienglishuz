import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeModule } from "@/components/HomeModule";
import { WritingModule } from "@/components/WritingModule";
import { SpeakingModule } from "@/components/SpeakingModule";
import { ReadingModule } from "@/components/ReadingModule";
import { ListeningModule } from "@/components/ListeningModule";
import { MockTestModule } from "@/components/MockTestModule";
import { LearningModule } from "@/components/LearningModule";
import { BookOpen, PenTool, Mic, LogOut, User, Loader2, LayoutDashboard, Headphones, Trophy, Menu, KeyRound, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { FocusModeFab } from "@/components/FocusModeFab";
import { SavedWordsFab } from "@/components/SavedWordsFab";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import Landing from "./Landing";

type Module = "home" | "learning" | "writing" | "speaking" | "reading" | "listening" | "mocktest";

const moduleIds = ["home", "learning", "writing", "speaking", "reading", "listening", "mocktest"] as const;

const isModule = (value: string | null): value is Module =>
  moduleIds.includes(value as Module);

const moduleRoutes: Record<Module, string> = {
  home: "/",
  learning: "/learning",
  mocktest: "/mock-test",
  reading: "/reading",
  listening: "/listening",
  writing: "/writing",
  speaking: "/speaking",
};

const routeModules: Record<string, Module> = {
  "/": "home",
  "/learning": "learning",
  "/mock-test": "mocktest",
  "/reading": "reading",
  "/listening": "listening",
  "/writing": "writing",
  "/speaking": "speaking",
};

const Index = () => {
  const [activeModule, setActiveModule] = useState<Module>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const {
    user,
    isLoading,
    signOut,
    isAuthenticated
  } = useAuth();
  const { displayName, avatarUrl, refetch: refetchProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const moduleParam = searchParams.get("module");
    if (isModule(moduleParam)) {
      setActiveModule(moduleParam);
      return;
    }

    setActiveModule(routeModules[location.pathname] || "home");
  }, [location.pathname, searchParams]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== "/") {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname]);

  const handleSelectModule = (module: Module) => {
    setActiveModule(module);
    setMobileMenuOpen(false);
    navigate(moduleRoutes[module]);
  };

  const handleBack = () => {
    handleSelectModule("home");
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
    return location.pathname === "/" ? <Landing /> : null;
  }

  const userEmail = user?.email || "";
  const userInitial = (displayName || userEmail).charAt(0).toUpperCase();

  const moduleItems = [
    { id: "home", label: "Home", icon: BookOpen },
    { id: "learning", label: "Learning", icon: GraduationCap },
    { id: "mocktest", label: "Mock Test", icon: Trophy },
    { id: "reading", label: "Reading", icon: BookOpen },
    { id: "listening", label: "Listening", icon: Headphones },
    { id: "writing", label: "Writing", icon: PenTool },
    { id: "speaking", label: "Speaking", icon: Mic },
  ] as const;

  return (
    <div className="min-h-screen bg-background bg-[linear-gradient(180deg,hsl(var(--secondary)/0.85),transparent_360px)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/85 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14 sm:h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl gradient-accent flex items-center justify-center shadow-card">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg sm:text-xl font-bold text-foreground">IELTS Coach</span>
          </div>

          {/* Desktop Navigation */}
          <Tabs value={activeModule} onValueChange={(v) => handleSelectModule(v as Module)} className="hidden lg:block">
            <TabsList>
              {moduleItems.map((item) => (
                  <TabsTrigger key={item.id} value={item.id} className="gap-2" asChild>
                    <a href={moduleRoutes[item.id]} onClick={(e) => e.preventDefault()}>
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </a>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="hidden sm:inline-flex gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-card">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary-foreground" />
                    </div>
                    IELTS Coach
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
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-12"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/dashboard");
                    }}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Dashboard
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                    <AvatarImage src={avatarUrl || undefined} alt="Profile" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="truncate">{displayName || userEmail}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <ProfileEditDialog
                  userId={user?.id || ""}
                  userEmail={userEmail}
                  currentDisplayName={displayName}
                  currentAvatarUrl={avatarUrl || undefined}
                  onProfileUpdate={refetchProfile}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      Edit Profile
                    </DropdownMenuItem>
                  }
                />
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
        {activeModule === "learning" && <LearningModule onBack={handleBack} onSelectModule={handleSelectModule} />}
        {activeModule === "writing" && <WritingModule onBack={handleBack} />}
        {activeModule === "speaking" && <SpeakingModule onBack={handleBack} />}
        {activeModule === "reading" && <ReadingModule onBack={handleBack} />}
        {activeModule === "listening" && <ListeningModule onBack={handleBack} />}
        {activeModule === "mocktest" && <MockTestModule onBack={handleBack} />}
      </main>

      {["reading", "listening", "writing", "speaking", "mocktest"].includes(activeModule) && (
        <FocusModeFab scope={activeModule} />
      )}

      <SavedWordsFab source={activeModule} />
      <KeyboardShortcuts />

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/60 py-4 sm:py-6 mt-auto">
        <div className="container text-center text-xs sm:text-sm text-muted-foreground px-4">
          <p>Complete IELTS test simulation with AI-powered feedback</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;