import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, BookmarkPlus, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSavedWords } from "@/hooks/useSavedWords";

interface Props {
  /** Where the user is — passed as source tag (e.g. "reading", "listening"). */
  source?: string;
}

/**
 * Floating bookmark button. Listens for text selection and offers a one-tap
 * save chip near the cursor. Also opens a panel listing all saved words.
 */
export function SavedWordsFab({ source }: Props) {
  const { words, add, remove } = useSavedWords();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [selection, setSelection] = useState<{
    text: string;
    x: number;
    y: number;
    context: string;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onUp = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() || "";
      if (!text || text.length > 80 || text.split(/\s+/).length > 6) {
        setSelection(null);
        return;
      }
      const range = sel!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // Try to capture a small surrounding sentence as context.
      const parent = range.startContainer.parentElement;
      const ctx = parent?.textContent?.slice(0, 240) || "";
      setSelection({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        context: ctx,
      });
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-save-chip]")) return;
      setSelection(null);
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const filtered = words.filter((w) =>
    w.word.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      {/* Inline save chip near selection */}
      {selection && !isFullscreen && (
        <button
          data-save-chip
          onClick={async () => {
            await add(selection.text, { context: selection.context, source });
            setSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
          style={{
            position: "fixed",
            left: Math.max(8, Math.min(window.innerWidth - 140, selection.x - 60)),
            top: Math.max(8, selection.y - 36),
            zIndex: 70,
          }}
          className="rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 shadow-lg flex items-center gap-1.5 hover:bg-primary/90"
        >
          <BookmarkPlus className="w-3.5 h-3.5" /> Save word
        </button>
      )}

      {/* Bookmark FAB — bottom-right so it doesn't collide with FocusModeFab */}
      <Button
        size="icon"
        variant="secondary"
        onClick={() => setOpen(true)}
        style={{ display: isFullscreen ? "none" : undefined }}
        className="fixed bottom-4 right-4 z-[60] rounded-full shadow-lg h-12 w-12"
        title="Saved words"
        aria-label="Open saved words"
      >
        <Bookmark className="w-5 h-5" />
        {words.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
            {words.length}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" /> Saved Words ({words.length})
            </SheetTitle>
            <SheetDescription>
              Highlight any word on the page and tap "Save word" to build your vocabulary list.
            </SheetDescription>
          </SheetHeader>

          <div className="relative mt-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter your words..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="flex-1 mt-3 -mx-2">
            <div className="px-2 space-y-2">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No saved words yet.
                </p>
              )}
              {filtered.map((w) => (
                <div
                  key={w.id}
                  className="rounded-lg border border-border p-3 bg-card flex flex-col gap-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-foreground">{w.word}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(w.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {w.context && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      "{w.context}"
                    </p>
                  )}
                  {w.source && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      From {w.source}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}