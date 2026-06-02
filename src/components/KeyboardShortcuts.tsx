import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const NAV: Record<string, string> = {
  h: "/",
  r: "/reading",
  l: "/listening",
  w: "/writing",
  s: "/speaking",
  m: "/mock-test",
  d: "/dashboard",
  e: "/learning",
};

const LABELS: { keys: string; label: string }[] = [
  { keys: "g then h", label: "Go to Home" },
  { keys: "g then r", label: "Go to Reading" },
  { keys: "g then l", label: "Go to Listening" },
  { keys: "g then w", label: "Go to Writing" },
  { keys: "g then s", label: "Go to Speaking" },
  { keys: "g then m", label: "Go to Mock Test" },
  { keys: "g then d", label: "Go to Dashboard" },
  { keys: "g then e", label: "Go to Learning" },
  { keys: "?", label: "Show this help" },
  { keys: "Esc", label: "Close dialogs / exit fullscreen" },
];

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable === true
  );
}

export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    let leader = false;
    let leaderTimer: number | null = null;

    const clearLeader = () => {
      leader = false;
      if (leaderTimer) {
        window.clearTimeout(leaderTimer);
        leaderTimer = null;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelp((v) => !v);
        return;
      }

      if (leader) {
        const route = NAV[e.key.toLowerCase()];
        clearLeader();
        if (route) {
          e.preventDefault();
          navigate(route);
        }
        return;
      }

      if (e.key.toLowerCase() === "g") {
        leader = true;
        leaderTimer = window.setTimeout(clearLeader, 1200);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearLeader();
    };
  }, [navigate]);

  return (
    <Dialog open={help} onOpenChange={setHelp}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-4 h-4" /> Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">?</kbd> any time
            to open this list.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 mt-2">
          {LABELS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <kbd className="px-2 py-1 rounded bg-muted text-foreground font-mono text-xs">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}