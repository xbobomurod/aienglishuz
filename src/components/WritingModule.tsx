import { useState } from "react";
import { Send, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScoreDisplay } from "./ScoreDisplay";
import { FeedbackTable } from "./FeedbackTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WritingModuleProps {
  onBack: () => void;
}

interface WritingFeedback {
  bandScore: number;
  breakdown: {
    taskResponse: number;
    coherence: number;
    lexicalResource: number;
    grammar: number;
  };
  errors: Array<{
    mistake: string;
    correction: string;
    logic: string;
  }>;
  suggestions: string[];
  overallFeedback: string;
}

export function WritingModule({ onBack }: WritingModuleProps) {
  const [topic, setTopic] = useState("");
  const [essay, setEssay] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);

  const handleSubmit = async () => {
    if (!essay.trim()) return;
    
    setIsLoading(true);
    
    // Simulate AI response for now - will be connected to Lovable AI
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setFeedback({
      bandScore: 6.5,
      breakdown: {
        taskResponse: 7,
        coherence: 6.5,
        lexicalResource: 6,
        grammar: 6.5,
      },
      errors: [
        {
          mistake: "The technology is very important",
          correction: "Technology plays a crucial role",
          logic: "Avoid weak adjectives like 'very'. Use more precise vocabulary.",
        },
        {
          mistake: "Peoples thinks that",
          correction: "People think that",
          logic: "'People' is already plural; use singular verb form 'think'.",
        },
      ],
      suggestions: [
        "Instead of 'good for society', try 'beneficial for societal development'",
        "Replace 'many problems' with 'numerous challenges'",
        "Use 'Furthermore' or 'Moreover' instead of 'Also'",
      ],
      overallFeedback: "Your essay demonstrates a good understanding of the topic with clear arguments. Focus on using more sophisticated vocabulary and varying your sentence structures to achieve a higher band score.",
    });
    
    setIsLoading(false);
  };

  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Writing Examiner
          </h1>
          <p className="text-muted-foreground text-sm">
            Submit your essay for IELTS-style evaluation
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Essay Topic (optional)
            </label>
            <Input
              placeholder="e.g., 'Should governments invest more in renewable energy?'"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-card"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                Your Essay
              </label>
              <span className={`text-sm ${wordCount < 250 ? 'text-muted-foreground' : 'text-success'}`}>
                {wordCount} words {wordCount >= 250 && <CheckCircle2 className="w-4 h-4 inline ml-1" />}
              </span>
            </div>
            <Textarea
              placeholder="Paste or write your essay here... (minimum 250 words recommended for IELTS Task 2)"
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              className="min-h-[300px] bg-card resize-none"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={!essay.trim() || isLoading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Evaluate Essay
              </>
            )}
          </Button>

          {wordCount > 0 && wordCount < 250 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 text-accent text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>IELTS Task 2 essays should be at least 250 words. You have {250 - wordCount} more words to go.</span>
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className="space-y-4">
          {feedback ? (
            <>
              {/* Score Overview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Band Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-around">
                    <ScoreDisplay score={feedback.bandScore} label="Overall" size="lg" />
                    <div className="grid grid-cols-2 gap-4">
                      <ScoreDisplay score={feedback.breakdown.taskResponse} label="Task" size="sm" />
                      <ScoreDisplay score={feedback.breakdown.coherence} label="Coherence" size="sm" />
                      <ScoreDisplay score={feedback.breakdown.lexicalResource} label="Lexical" size="sm" />
                      <ScoreDisplay score={feedback.breakdown.grammar} label="Grammar" size="sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Feedback */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feedback.overallFeedback}</p>
                </CardContent>
              </Card>

              {/* Error Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Error Analysis</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <FeedbackTable items={feedback.errors} />
                </CardContent>
              </Card>

              {/* Suggestions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Grade-Up Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feedback.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] rounded-xl border border-dashed border-border bg-secondary/30">
              <div className="text-center text-muted-foreground">
                <PenIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Submit your essay to see detailed feedback</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}
