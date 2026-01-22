import { Award, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ModelAnswerProps {
  answer: string;
  level?: string;
}

export function ModelAnswer({ answer, level = "C1" }: ModelAnswerProps) {
  return (
    <Card className="border-success/30 bg-gradient-to-br from-success/5 to-success/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-success" />
          Model Answer
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-success/20 text-success">
            {level} Level
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[200px]">
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {answer}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
