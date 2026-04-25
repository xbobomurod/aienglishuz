import { FileText, MessageSquare, Clock, Users, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type WritingTaskType = "task1" | "task2";
export type SpeakingTaskType = "interview" | "talk" | "discussion";

interface WritingTaskSelectorProps {
  type: "writing";
  selectedTask: WritingTaskType;
  onSelectTask: (task: WritingTaskType) => void;
}

interface SpeakingTaskSelectorProps {
  type: "speaking";
  selectedTask: SpeakingTaskType;
  onSelectTask: (task: SpeakingTaskType) => void;
}

type TaskSelectorProps = WritingTaskSelectorProps | SpeakingTaskSelectorProps;

const writingTasks = [
  {
    id: "task1" as const,
    title: "Task 1: Academic",
    description: "Describe a graph, chart, table, diagram or process.",
    icon: BarChart3,
    wordCount: 150,
  },
  {
    id: "task2" as const,
    title: "Task 2: Essay",
    description: "Academic argumentation essay (250+ words).",
    icon: FileText,
    wordCount: 250,
  },
];

const speakingTasks = [
  {
    id: "interview" as const,
    title: "Part 1: Interview",
    description: "General questions about familiar topics.",
    icon: MessageSquare,
    duration: "4-5 min",
  },
  {
    id: "talk" as const,
    title: "Part 2: Long Turn",
    description: "1-2 minute talk on a cue card topic.",
    icon: Clock,
    duration: "1-2 min",
  },
  {
    id: "discussion" as const,
    title: "Part 3: Discussion",
    description: "In-depth analytical discussion.",
    icon: Users,
    duration: "2 min",
  },
];

export function TaskSelector(props: TaskSelectorProps) {
  const { type, selectedTask } = props;
  const tasks = type === "writing" ? writingTasks : speakingTasks;

  const handleClick = (id: string) => {
    if (props.type === "writing") {
      props.onSelectTask(id as WritingTaskType);
    } else {
      props.onSelectTask(id as SpeakingTaskType);
    }
  };

  return (
    <div className={cn(
      "grid gap-2 sm:gap-3",
      type === "writing" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"
    )}>
      {tasks.map((task) => {
        const Icon = task.icon;
        const isSelected = selectedTask === task.id;
        
        return (
          <Card
            key={task.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected
                ? "border-2 border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => handleClick(task.id)}
          >
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardTitle className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
                <Icon className={cn(
                  "w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "truncate",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {task.title}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0">
              <CardDescription className="text-[10px] sm:text-xs line-clamp-2">
                {task.description}
              </CardDescription>
              <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-muted-foreground">
                {"wordCount" in task ? `${task.wordCount}+ words` : task.duration}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
