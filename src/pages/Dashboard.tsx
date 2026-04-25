import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  PenTool,
  Mic,
  Eye,
  BarChart3,
  BookOpen,
  Headphones,
  KeyRound,
  User,
  Globe,
  Target,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { useEvaluationHistory, WritingEvaluation, SpeakingEvaluation, ReadingEvaluation, ListeningEvaluation } from "@/hooks/useEvaluationHistory";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { format, subDays, isAfter } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmailPreferences } from "@/components/EmailPreferences";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";

type TimeFilter = "7d" | "30d" | "90d" | "all";

const chartConfig = {
  writing: {
    label: "Writing",
    color: "hsl(var(--primary))",
  },
  speaking: {
    label: "Speaking",
    color: "hsl(var(--accent))",
  },
  reading: {
    label: "Reading",
    color: "hsl(217 91% 60%)",
  },
  listening: {
    label: "Listening",
    color: "hsl(280 87% 65%)",
  },
} satisfies ChartConfig;

export default function Dashboard() {
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated, user, signOut } = useAuth();
  const { profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { writingHistory, speakingHistory, readingHistory, listeningHistory, isLoading } = useEvaluationHistory();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");
  const [selectedWriting, setSelectedWriting] = useState<WritingEvaluation | null>(null);
  const [selectedSpeaking, setSelectedSpeaking] = useState<SpeakingEvaluation | null>(null);
  const [selectedReading, setSelectedReading] = useState<ReadingEvaluation | null>(null);
  const [selectedListening, setSelectedListening] = useState<ListeningEvaluation | null>(null);

  if (authLoading || isLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/auth");
    return null;
  }

  const filterByTime = <T extends { created_at: string }>(items: T[]): T[] => {
    if (timeFilter === "all") return items;
    const days = timeFilter === "7d" ? 7 : timeFilter === "30d" ? 30 : 90;
    const cutoff = subDays(new Date(), days);
    return items.filter((item) => isAfter(new Date(item.created_at), cutoff));
  };

  const filteredWriting = filterByTime(writingHistory);
  const filteredSpeaking = filterByTime(speakingHistory);
  const filteredReading = filterByTime(readingHistory);
  const filteredListening = filterByTime(listeningHistory);

  // Prepare chart data - combine all scores over time
  const prepareChartData = () => {
    const allDates = new Map<string, { writing?: number; speaking?: number; reading?: number; listening?: number }>();

    filteredWriting.forEach((w) => {
      const date = format(new Date(w.created_at), "MMM d");
      const existing = allDates.get(date) || {};
      allDates.set(date, { ...existing, writing: w.band_score });
    });

    filteredSpeaking.forEach((s) => {
      const date = format(new Date(s.created_at), "MMM d");
      const existing = allDates.get(date) || {};
      allDates.set(date, { ...existing, speaking: s.band_score });
    });

    filteredReading.forEach((r) => {
      const date = format(new Date(r.created_at), "MMM d");
      const existing = allDates.get(date) || {};
      allDates.set(date, { ...existing, reading: r.band_score });
    });

    filteredListening.forEach((l) => {
      const date = format(new Date(l.created_at), "MMM d");
      const existing = allDates.get(date) || {};
      allDates.set(date, { ...existing, listening: l.band_score });
    });

    return Array.from(allDates.entries())
      .map(([date, scores]) => ({ date, ...scores }))
      .reverse();
  };

  const chartData = prepareChartData();

  const getScoreColor = (score: number) => {
    if (score >= 7) return "bg-success/10 text-success";
    if (score >= 5) return "bg-accent/10 text-accent";
    return "bg-destructive/10 text-destructive";
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const avgWritingScore = filteredWriting.length
    ? (filteredWriting.reduce((sum, w) => sum + w.band_score, 0) / filteredWriting.length).toFixed(1)
    : "—";

  const avgSpeakingScore = filteredSpeaking.length
    ? (filteredSpeaking.reduce((sum, s) => sum + s.band_score, 0) / filteredSpeaking.length).toFixed(1)
    : "—";

  const avgReadingScore = filteredReading.length
    ? (filteredReading.reduce((sum, r) => sum + r.band_score, 0) / filteredReading.length).toFixed(1)
    : "—";

  const avgListeningScore = filteredListening.length
    ? (filteredListening.reduce((sum, l) => sum + l.band_score, 0) / filteredListening.length).toFixed(1)
    : "—";

  const writingTrend = writingHistory.length >= 2
    ? writingHistory[0].band_score - writingHistory[1].band_score
    : 0;

  const speakingTrend = speakingHistory.length >= 2
    ? speakingHistory[0].band_score - speakingHistory[1].band_score
    : 0;

  const readingTrend = readingHistory.length >= 2
    ? readingHistory[0].band_score - readingHistory[1].band_score
    : 0;

  const listeningTrend = listeningHistory.length >= 2
    ? listeningHistory[0].band_score - listeningHistory[1].band_score
    : 0;

  const totalEvaluations = filteredWriting.length + filteredSpeaking.length + filteredReading.length + filteredListening.length;

  // Calculate combined average
  const scores = [
    avgWritingScore !== "—" ? parseFloat(avgWritingScore) : null,
    avgSpeakingScore !== "—" ? parseFloat(avgSpeakingScore) : null,
    avgReadingScore !== "—" ? parseFloat(avgReadingScore) : null,
    avgListeningScore !== "—" ? parseFloat(avgListeningScore) : null,
  ].filter((s): s is number => s !== null);
  
  const combinedAverage = scores.length > 0 
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : "—";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14 sm:h-16 px-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Track your progress over time</p>
            </div>
          </div>

          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[110px] sm:w-[140px]">
              <Filter className="w-4 h-4 mr-1 sm:mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="container py-4 sm:py-8 px-4 space-y-4 sm:space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Reading
              </CardTitle>
              <BookOpen className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{avgReadingScore}</div>
              {readingTrend !== 0 && (
                <p className={`text-xs flex items-center gap-1 ${readingTrend > 0 ? "text-success" : "text-destructive"}`}>
                  {readingTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {readingTrend > 0 ? "+" : ""}{readingTrend.toFixed(1)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Listening
              </CardTitle>
              <Headphones className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{avgListeningScore}</div>
              {listeningTrend !== 0 && (
                <p className={`text-xs flex items-center gap-1 ${listeningTrend > 0 ? "text-success" : "text-destructive"}`}>
                  {listeningTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {listeningTrend > 0 ? "+" : ""}{listeningTrend.toFixed(1)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Writing
              </CardTitle>
              <PenTool className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{avgWritingScore}</div>
              {writingTrend !== 0 && (
                <p className={`text-xs flex items-center gap-1 ${writingTrend > 0 ? "text-success" : "text-destructive"}`}>
                  {writingTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {writingTrend > 0 ? "+" : ""}{writingTrend.toFixed(1)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Speaking
              </CardTitle>
              <Mic className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{avgSpeakingScore}</div>
              {speakingTrend !== 0 && (
                <p className={`text-xs flex items-center gap-1 ${speakingTrend > 0 ? "text-success" : "text-destructive"}`}>
                  {speakingTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {speakingTrend > 0 ? "+" : ""}{speakingTrend.toFixed(1)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Tests
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{totalEvaluations}</div>
              <p className="text-xs text-muted-foreground truncate">
                R:{filteredReading.length} L:{filteredListening.length} W:{filteredWriting.length} S:{filteredSpeaking.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Overall
              </CardTitle>
              <Badge variant="outline" className="text-primary border-primary text-xs">IELTS</Badge>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{combinedAverage}</div>
              <p className="text-xs text-muted-foreground">Combined avg</p>
            </CardContent>
          </Card>
        </div>

        {/* Score Trends Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Score Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ChartContainer config={chartConfig} className="h-[200px] sm:h-[300px] w-full">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 9]} ticks={[0, 3, 5, 7, 9]} className="text-xs" tick={{ fontSize: 10 }} width={25} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="reading"
                    stroke="var(--color-reading)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-reading)", r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="listening"
                    stroke="var(--color-listening)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-listening)", r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="writing"
                    stroke="var(--color-writing)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-writing)", r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="speaking"
                    stroke="var(--color-speaking)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-speaking)", r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ChartContainer>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-3 sm:mt-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Reading</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-purple-500" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Listening</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Writing</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-accent" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Speaking</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account & Notification Settings */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-4">
              {/* Profile Edit */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Profile</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {profile?.display_name || user?.email?.split('@')[0] || 'User'}
                    </p>
                  </div>
                </div>
                <ProfileEditDialog 
                  trigger={<Button variant="outline" size="sm">Edit Profile</Button>}
                  userId={user?.id || ""}
                  userEmail={user?.email || ""}
                  currentDisplayName={profile?.display_name || undefined}
                  currentAvatarUrl={profile?.avatar_url || undefined}
                  onProfileUpdate={() => refetchProfile()}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Password</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Change your account password</p>
                  </div>
                </div>
                <ChangePasswordDialog />
              </div>

              {/* Target Score */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Target Score</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Set your IELTS goal</p>
                  </div>
                </div>
                <Select defaultValue="7">
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Band 5</SelectItem>
                    <SelectItem value="5.5">Band 5.5</SelectItem>
                    <SelectItem value="6">Band 6</SelectItem>
                    <SelectItem value="6.5">Band 6.5</SelectItem>
                    <SelectItem value="7">Band 7</SelectItem>
                    <SelectItem value="7.5">Band 7.5</SelectItem>
                    <SelectItem value="8">Band 8</SelectItem>
                    <SelectItem value="8.5">Band 8.5</SelectItem>
                    <SelectItem value="9">Band 9</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Interface Language</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Display language</p>
                  </div>
                </div>
                <Select defaultValue="en">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="uz">O'zbekcha</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sign Out */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="font-medium text-sm sm:text-base text-destructive">Sign Out</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Log out of your account</p>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    signOut();
                    navigate("/auth");
                  }}
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Preferences */}
          <EmailPreferences />
        </div>

        {/* Evaluation History Tabs */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Evaluation History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <Tabs defaultValue="reading">
              <TabsList className="mb-4 w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="reading" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Reading</span>
                  <span className="sm:hidden">R</span>
                  <span className="text-muted-foreground">({filteredReading.length})</span>
                </TabsTrigger>
                <TabsTrigger value="listening" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
                  <Headphones className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Listening</span>
                  <span className="sm:hidden">L</span>
                  <span className="text-muted-foreground">({filteredListening.length})</span>
                </TabsTrigger>
                <TabsTrigger value="writing" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
                  <PenTool className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Writing</span>
                  <span className="sm:hidden">W</span>
                  <span className="text-muted-foreground">({filteredWriting.length})</span>
                </TabsTrigger>
                <TabsTrigger value="speaking" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
                  <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Speaking</span>
                  <span className="sm:hidden">S</span>
                  <span className="text-muted-foreground">({filteredSpeaking.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reading">
                <ScrollArea className="h-[300px] sm:h-[400px]">
                  {filteredReading.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground">
                      <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No reading evaluations in this period</p>
                    </div>
                  ) : (
                    <div className="space-y-2 px-2">
                      {filteredReading.map((evaluation) => (
                        <div
                          key={evaluation.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer gap-2"
                          onClick={() => setSelectedReading(evaluation)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm sm:text-base">
                              {evaluation.passage_topic || "Reading Passage"}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {format(new Date(evaluation.created_at), "MMM d, yyyy")} • {evaluation.correct_count}/{evaluation.total_questions} correct
                              {evaluation.time_taken_seconds && ` • ${formatTime(evaluation.time_taken_seconds)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Badge className={`${getScoreColor(evaluation.band_score)} text-xs`}>
                              {evaluation.band_score}/9
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="listening">
                <ScrollArea className="h-[300px] sm:h-[400px]">
                  {filteredListening.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground">
                      <Headphones className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No listening evaluations in this period</p>
                    </div>
                  ) : (
                    <div className="space-y-2 px-2">
                      {filteredListening.map((evaluation) => (
                        <div
                          key={evaluation.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer gap-2"
                          onClick={() => setSelectedListening(evaluation)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm sm:text-base">
                              {evaluation.audio_topic || "Listening Test"}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {format(new Date(evaluation.created_at), "MMM d, yyyy")} • {evaluation.correct_count}/{evaluation.total_questions} correct
                              {evaluation.time_taken_seconds && ` • ${formatTime(evaluation.time_taken_seconds)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Badge className={`${getScoreColor(evaluation.band_score)} text-xs`}>
                              {evaluation.band_score}/9
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="writing">
                <ScrollArea className="h-[300px] sm:h-[400px]">
                  {filteredWriting.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground">
                      <PenTool className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No writing evaluations in this period</p>
                    </div>
                  ) : (
                    <div className="space-y-2 px-2">
                      {filteredWriting.map((evaluation) => (
                        <div
                          key={evaluation.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer gap-2"
                          onClick={() => setSelectedWriting(evaluation)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm sm:text-base">
                              {evaluation.topic || "Untitled Essay"}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {format(new Date(evaluation.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Badge className={`${getScoreColor(evaluation.band_score)} text-xs`}>
                              {evaluation.band_score}/9
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="speaking">
                <ScrollArea className="h-[300px] sm:h-[400px]">
                  {filteredSpeaking.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground">
                      <Mic className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No speaking evaluations in this period</p>
                    </div>
                  ) : (
                    <div className="space-y-2 px-2">
                      {filteredSpeaking.map((evaluation) => (
                        <div
                          key={evaluation.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer gap-2"
                          onClick={() => setSelectedSpeaking(evaluation)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm sm:text-base">
                              {evaluation.topic || "Untitled Recording"}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {format(new Date(evaluation.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Badge className={`${getScoreColor(evaluation.band_score)} text-xs`}>
                              {evaluation.band_score}/9
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Reading Detail Dialog */}
      <Dialog open={!!selectedReading} onOpenChange={() => setSelectedReading(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg pr-6">{selectedReading?.passage_topic || "Reading Evaluation"}</DialogTitle>
          </DialogHeader>
          {selectedReading && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <Badge className={`${getScoreColor(selectedReading.band_score)} text-sm sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1`}>
                  IELTS: {selectedReading.band_score}/9
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Correct</p>
                  <p className="text-sm sm:text-lg font-semibold">{selectedReading.correct_count}/{selectedReading.total_questions}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Accuracy</p>
                  <p className="text-sm sm:text-lg font-semibold">
                    {Math.round((selectedReading.correct_count / selectedReading.total_questions) * 100)}%
                  </p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Time</p>
                  <p className="text-sm sm:text-lg font-semibold">{formatTime(selectedReading.time_taken_seconds)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Passage</p>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 sm:p-4 rounded-lg max-h-[150px] sm:max-h-[200px] overflow-y-auto">
                  {selectedReading.passage_text}
                </p>
              </div>

              {selectedReading.feedback && (
                <div>
                  <p className="text-sm font-medium mb-2">Feedback</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedReading.feedback}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Listening Detail Dialog */}
      <Dialog open={!!selectedListening} onOpenChange={() => setSelectedListening(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg pr-6">{selectedListening?.audio_topic || "Listening Evaluation"}</DialogTitle>
          </DialogHeader>
          {selectedListening && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <Badge className={`${getScoreColor(selectedListening.band_score)} text-sm sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1`}>
                  IELTS: {selectedListening.band_score}/9
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Correct</p>
                  <p className="text-sm sm:text-lg font-semibold">{selectedListening.correct_count}/{selectedListening.total_questions}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Accuracy</p>
                  <p className="text-sm sm:text-lg font-semibold">
                    {Math.round((selectedListening.correct_count / selectedListening.total_questions) * 100)}%
                  </p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Time</p>
                  <p className="text-sm sm:text-lg font-semibold">{formatTime(selectedListening.time_taken_seconds)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Transcript</p>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 sm:p-4 rounded-lg max-h-[150px] sm:max-h-[200px] overflow-y-auto">
                  {selectedListening.transcript}
                </p>
              </div>

              {selectedListening.feedback && (
                <div>
                  <p className="text-sm font-medium mb-2">Feedback</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedListening.feedback}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Writing Detail Dialog */}
      <Dialog open={!!selectedWriting} onOpenChange={() => setSelectedWriting(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg pr-6">{selectedWriting?.topic || "Writing Evaluation"}</DialogTitle>
          </DialogHeader>
          {selectedWriting && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <Badge className={`${getScoreColor(selectedWriting.band_score)} text-sm sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1`}>
                  IELTS: {selectedWriting.band_score}/9
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Task Response</p>
                  <p className="text-sm sm:text-lg font-semibold">{selectedWriting.task_response}/9</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Coherence</p>
                  <p className="text-sm sm:text-lg font-semibold">{selectedWriting.coherence}/9</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Lexical Resource</p>
                  <p className="text-sm sm:text-lg font-semibold">{selectedWriting.lexical_resource}/9</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Grammar</p>
                  <p className="text-sm sm:text-lg font-semibold">{selectedWriting.grammar}/9</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Your Essay</p>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 sm:p-4 rounded-lg max-h-[150px] sm:max-h-[200px] overflow-y-auto">
                  {selectedWriting.essay}
                </p>
              </div>

              {selectedWriting.overall_feedback && (
                <div>
                  <p className="text-sm font-medium mb-2">Feedback</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedWriting.overall_feedback}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Speaking Detail Dialog */}
      <Dialog open={!!selectedSpeaking} onOpenChange={() => setSelectedSpeaking(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg pr-6">{selectedSpeaking?.topic || "Speaking Evaluation"}</DialogTitle>
          </DialogHeader>
          {selectedSpeaking && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <Badge className={`${getScoreColor(selectedSpeaking.band_score)} text-sm sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1`}>
                  IELTS: {selectedSpeaking.band_score}/9
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Fluency</p>
                  <p className="text-sm sm:text-lg font-semibold">{selectedSpeaking.fluency_score}/9</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Vocabulary</p>
                  <p className="text-sm sm:text-lg font-semibold">{selectedSpeaking.vocabulary_score}/9</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">Grammar</p>
                  <p className="text-sm sm:text-lg font-semibold">{selectedSpeaking.grammar_score}/9</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Your Transcript</p>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 sm:p-4 rounded-lg max-h-[150px] sm:max-h-[200px] overflow-y-auto">
                  {selectedSpeaking.transcript}
                </p>
              </div>

              {selectedSpeaking.native_upgrade && (
                <div>
                  <p className="text-sm font-medium mb-2">Band 8+ Model Upgrade</p>
                  <p className="text-xs sm:text-sm text-primary italic bg-primary/10 p-3 sm:p-4 rounded-lg">
                    {selectedSpeaking.native_upgrade}
                  </p>
                </div>
              )}

              {selectedSpeaking.daily_practice_tip && (
                <div>
                  <p className="text-sm font-medium mb-2">Practice Tip</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedSpeaking.daily_practice_tip}</p>
                </div>
              )}

              {selectedSpeaking.overall_feedback && (
                <div>
                  <p className="text-sm font-medium mb-2">Feedback</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedSpeaking.overall_feedback}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
