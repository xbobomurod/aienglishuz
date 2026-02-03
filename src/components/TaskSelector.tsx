import { FileText, MessageSquare, Image, Clock, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type WritingTaskType = "task1" | "task2";
export type SpeakingTaskType = "interview" | "picture" | "talk" | "discussion";

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
    title: "Task 1: Letter/Email",
    description: "40 words minimum. Formal or informal letter.",
    icon: FileText,
    wordCount: 40,
  },
  {
    id: "task2" as const,
    title: "Task 2: Essay",
    description: "250 words minimum. Academic argumentation.",
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
    id: "picture" as const,
    title: "Part 1.2: Picture Description",
    description: "Describe an image or scene in detail.",
    icon: Image,
    duration: "1-2 min",
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
    <div className="grid grid-cols-2 gap-3">
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
            <CardHeader className="p-3 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Icon className={cn(
                  "w-4 h-4",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={isSelected ? "text-primary" : "text-foreground"}>
                  {task.title}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <CardDescription className="text-xs">
                {task.description}
              </CardDescription>
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {"wordCount" in task ? `${task.wordCount}+ words` : task.duration}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
