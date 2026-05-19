import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Maximize2, Minimize2, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";

const FocusScopeContext = createContext<string | null>(null);

export function FocusScope({ scope, children }: { scope: string; children: ReactNode }) {
  return <FocusScopeContext.Provider value={scope}>{children}</FocusScopeContext.Provider>;
}

interface FocusModeFabProps {
  /** Default storage scope for notes — overridden by nearest <FocusScope>. */
  scope: string;
}

export function FocusModeFab({ scope }: FocusModeFabProps) {
  const sectionScope = useContext(FocusScopeContext);
  const effectiveScope = sectionScope ? `${scope}:${sectionScope}` : scope;
  const storageKey = useMemo(() => `focus-notes:${effectiveScope}`, [effectiveScope]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // Load notes whenever the scope changes
  useEffect(() => {
    try {
      setNotes(localStorage.getItem(storageKey) || "");
    } catch {}
  }, [storageKey]);

  // Persist notes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, notes);
    } catch {}
  }, [notes, storageKey]);

  // Track native fullscreen state + body class for chrome hiding
  useEffect(() => {
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      document.body.classList.toggle("focus-mode", fs);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.body.classList.remove("focus-mode");
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      toast.error("Fullscreen is not available in this browser.");
    }
  };

  return (
    <>
      <div
        className="fixed right-3 top-1/2 -translate-y-1/2 z-[60] flex flex-col gap-2"
        style={{ display: isFullscreen ? "none" : undefined }}
        aria-hidden={isFullscreen}
      >
        <Button
          size="icon"
          variant="secondary"
          onClick={toggleFullscreen}
          className="rounded-full shadow-lg h-11 w-11"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          variant={notesOpen ? "default" : "secondary"}
          onClick={() => setNotesOpen(true)}
          className="rounded-full shadow-lg h-11 w-11"
          title="Open notes"
          aria-label="Open notes"
        >
          <StickyNote className="w-5 h-5" />
        </Button>
      </div>

      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> Notes
            </SheetTitle>
            <SheetDescription>
              Quick scratchpad for this test. Saved automatically on this device.
            </SheetDescription>
          </SheetHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write keywords, ideas, key numbers..."
            className="flex-1 mt-4 resize-none min-h-[60vh] text-sm"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-muted-foreground">{notes.length} chars</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotes("")}
              className="gap-1 text-destructive"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
