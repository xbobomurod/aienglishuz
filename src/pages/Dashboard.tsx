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
import { useEvaluationHistory, WritingEvaluation, SpeakingEvaluation } from "@/hooks/useEvaluationHistory";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, isAfter } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmailPreferences } from "@/components/EmailPreferences";

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
} satisfies ChartConfig;

export default function Dashboard() {
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { writingHistory, speakingHistory, isLoading } = useEvaluationHistory();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");
  const [selectedWriting, setSelectedWriting] = useState<WritingEvaluation | null>(null);
  const [selectedSpeaking, setSelectedSpeaking] = useState<SpeakingEvaluation | null>(null);

  if (authLoading || isLoading) {
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

  // Prepare chart data - combine writing and speaking scores over time
  const prepareChartData = () => {
    const allDates = new Map<string, { writing?: number; speaking?: number }>();

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

  const getCefrFromBand = (band: number): string => {
    if (band >= 8) return "C2";
    if (band >= 7) return "C1";
    if (band >= 5.5) return "B2";
    if (band >= 4) return "B1";
    return "A2";
  };

  const avgWritingScore = filteredWriting.length
    ? (filteredWriting.reduce((sum, w) => sum + w.band_score, 0) / filteredWriting.length).toFixed(1)
    : "—";

  const avgSpeakingScore = filteredSpeaking.length
    ? (filteredSpeaking.reduce((sum, s) => sum + s.band_score, 0) / filteredSpeaking.length).toFixed(1)
    : "—";

  const writingTrend = writingHistory.length >= 2
    ? writingHistory[0].band_score - writingHistory[1].band_score
    : 0;

  const speakingTrend = speakingHistory.length >= 2
    ? speakingHistory[0].band_score - speakingHistory[1].band_score
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Track your progress over time</p>
            </div>
          </div>

          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
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

      <main className="container py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Writing Average
              </CardTitle>
              <PenTool className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgWritingScore}</div>
              {writingTrend !== 0 && (
                <p className={`text-xs flex items-center gap-1 ${writingTrend > 0 ? "text-success" : "text-destructive"}`}>
                  {writingTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {writingTrend > 0 ? "+" : ""}{writingTrend.toFixed(1)} from last
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Speaking Average
              </CardTitle>
              <Mic className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSpeakingScore}</div>
              {speakingTrend !== 0 && (
                <p className={`text-xs flex items-center gap-1 ${speakingTrend > 0 ? "text-success" : "text-destructive"}`}>
                  {speakingTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {speakingTrend > 0 ? "+" : ""}{speakingTrend.toFixed(1)} from last
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Evaluations
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredWriting.length + filteredSpeaking.length}</div>
              <p className="text-xs text-muted-foreground">
                {filteredWriting.length} writing, {filteredSpeaking.length} speaking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current CEFR Level
              </CardTitle>
              <Badge variant="outline" className="text-primary border-primary">
                {getCefrFromBand(
                  (parseFloat(avgWritingScore !== "—" ? avgWritingScore : "0") +
                    parseFloat(avgSpeakingScore !== "—" ? avgSpeakingScore : "0")) /
                    2
                )}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(
                  (parseFloat(avgWritingScore !== "—" ? avgWritingScore : "0") +
                    parseFloat(avgSpeakingScore !== "—" ? avgSpeakingScore : "0")) /
                  2
                ).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">Combined average</p>
            </CardContent>
          </Card>
        </div>

        {/* Score Trends Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Score Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[0, 9]} ticks={[0, 3, 5, 7, 9]} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="writing"
                    stroke="var(--color-writing)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-writing)" }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="speaking"
                    stroke="var(--color-speaking)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-speaking)" }}
                    connectNulls
                  />
                </LineChart>
              </ChartContainer>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">Writing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <span className="text-sm text-muted-foreground">Speaking</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Preferences */}
        <EmailPreferences />

        {/* Evaluation History Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Evaluation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="writing">
              <TabsList className="mb-4">
                <TabsTrigger value="writing" className="gap-2">
                  <PenTool className="w-4 h-4" />
                  Writing ({filteredWriting.length})
                </TabsTrigger>
                <TabsTrigger value="speaking" className="gap-2">
                  <Mic className="w-4 h-4" />
                  Speaking ({filteredSpeaking.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="writing">
                <ScrollArea className="h-[400px]">
                  {filteredWriting.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <PenTool className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No writing evaluations in this period</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredWriting.map((evaluation) => (
                        <div
                          key={evaluation.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedWriting(evaluation)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {evaluation.topic || "Untitled Essay"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(evaluation.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getScoreColor(evaluation.band_score)}>
                              {evaluation.band_score}/9
                            </Badge>
                            <Badge variant="outline">{getCefrFromBand(evaluation.band_score)}</Badge>
                            <Button variant="ghost" size="icon">
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
                <ScrollArea className="h-[400px]">
                  {filteredSpeaking.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No speaking evaluations in this period</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredSpeaking.map((evaluation) => (
                        <div
                          key={evaluation.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedSpeaking(evaluation)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {evaluation.topic || "Untitled Recording"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(evaluation.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getScoreColor(evaluation.band_score)}>
                              {evaluation.band_score}/9
                            </Badge>
                            <Badge variant="outline">{getCefrFromBand(evaluation.band_score)}</Badge>
                            <Button variant="ghost" size="icon">
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

      {/* Writing Detail Dialog */}
      <Dialog open={!!selectedWriting} onOpenChange={() => setSelectedWriting(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedWriting?.topic || "Writing Evaluation"}</DialogTitle>
          </DialogHeader>
          {selectedWriting && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={`${getScoreColor(selectedWriting.band_score)} text-lg px-3 py-1`}>
                  IELTS: {selectedWriting.band_score}/9
                </Badge>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  CEFR: {getCefrFromBand(selectedWriting.band_score)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Task Response</p>
                  <p className="text-lg font-semibold">{selectedWriting.task_response}/9</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Coherence</p>
                  <p className="text-lg font-semibold">{selectedWriting.coherence}/9</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Lexical Resource</p>
                  <p className="text-lg font-semibold">{selectedWriting.lexical_resource}/9</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Grammar</p>
                  <p className="text-lg font-semibold">{selectedWriting.grammar}/9</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Your Essay</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-4 rounded-lg">
                  {selectedWriting.essay}
                </p>
              </div>

              {selectedWriting.overall_feedback && (
                <div>
                  <p className="text-sm font-medium mb-2">Feedback</p>
                  <p className="text-sm text-muted-foreground">{selectedWriting.overall_feedback}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Speaking Detail Dialog */}
      <Dialog open={!!selectedSpeaking} onOpenChange={() => setSelectedSpeaking(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSpeaking?.topic || "Speaking Evaluation"}</DialogTitle>
          </DialogHeader>
          {selectedSpeaking && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={`${getScoreColor(selectedSpeaking.band_score)} text-lg px-3 py-1`}>
                  IELTS: {selectedSpeaking.band_score}/9
                </Badge>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  CEFR: {getCefrFromBand(selectedSpeaking.band_score)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Fluency</p>
                  <p className="text-lg font-semibold">{selectedSpeaking.fluency_score}/9</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Vocabulary</p>
                  <p className="text-lg font-semibold">{selectedSpeaking.vocabulary_score}/9</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Grammar</p>
                  <p className="text-lg font-semibold">{selectedSpeaking.grammar_score}/9</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Your Transcript</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-4 rounded-lg">
                  {selectedSpeaking.transcript}
                </p>
              </div>

              {selectedSpeaking.native_upgrade && (
                <div>
                  <p className="text-sm font-medium mb-2">Native Upgrade (C1)</p>
                  <p className="text-sm text-primary italic bg-primary/10 p-4 rounded-lg">
                    {selectedSpeaking.native_upgrade}
                  </p>
                </div>
              )}

              {selectedSpeaking.daily_practice_tip && (
                <div>
                  <p className="text-sm font-medium mb-2">Practice Tip</p>
                  <p className="text-sm text-muted-foreground">{selectedSpeaking.daily_practice_tip}</p>
                </div>
              )}

              {selectedSpeaking.overall_feedback && (
                <div>
                  <p className="text-sm font-medium mb-2">Feedback</p>
                  <p className="text-sm text-muted-foreground">{selectedSpeaking.overall_feedback}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
