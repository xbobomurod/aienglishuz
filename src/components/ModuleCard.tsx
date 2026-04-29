import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isActive?: boolean;
  onClick?: () => void;
  accentColor?: "primary" | "accent" | "success";
}

const colorVariants = {
  primary: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
  accent: "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
  success: "bg-success/10 text-success group-hover:bg-success group-hover:text-success-foreground",
};

export function ModuleCard({
  icon: Icon,
  title,
  description,
  isActive,
  onClick,
  accentColor = "primary",
}: ModuleCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full p-6 rounded-2xl bg-card shadow-card border border-border text-left transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-primary/30",
        isActive && "ring-2 ring-primary border-primary/30"
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
          colorVariants[accentColor]
        )}
      >
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
      {isActive && (
        <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-primary animate-pulse-soft" />
      )}
    </button>
  );
}
