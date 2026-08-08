import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, Shuffle, Volume2, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSavedWords } from "@/hooks/useSavedWords";

export function VocabFlashcards() {
  const { words } = useSavedWords();
  const [deck, setDeck] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);

  const ids = useMemo(() => words.map((w) => w.id).join(","), [words]);

  useEffect(() => {
    setDeck(words.map((w) => w.id));
    setIndex(0);
    setFlipped(false);
    setKnown([]);
  }, [ids]);

  const current = words.find((w) => w.id === deck[index]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  const next = (asKnown: boolean) => {
    if (current && asKnown && !known.includes(current.id)) setKnown((k) => [...k, current.id]);
    setFlipped(false);
    setIndex((i) => (i + 1) % Math.max(1, deck.length));
  };

  const shuffle = () => {
    setDeck((d) => [...d].sort(() => Math.random() - 0.5));
    setIndex(0);
    setFlipped(false);
  };

  return (
    <Card className="border-border">
      <CardContent className="p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold md:text-xl">Vocabulary flashcards</h2>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {words.length ? `${known.length}/${words.length} known` : "Empty deck"}
          </Badge>
        </div>

        {!words.length ? (
          <p className="rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
            Select any word while practising Reading or Listening and tap “Save word”. Your saved words appear here as flashcards.
          </p>
        ) : (
          <>
            <Progress value={(known.length / words.length) * 100} className="mb-4 h-2" />
            <button
              onClick={() => setFlipped((f) => !f)}
              className="flex min-h-[160px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-secondary/50 p-6 text-center transition-colors hover:bg-secondary"
            >
              {!flipped ? (
                <>
                  <p className="font-display text-2xl font-bold text-foreground md:text-3xl">{current?.word}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Tap to reveal context</p>
                </>
              ) : (
                <>
                  <p className="text-sm leading-6 text-foreground">
                    {current?.definition || current?.context || "No context saved for this word — try using it in a sentence."}
                  </p>
                  {current?.source && (
                    <span className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                      from {current.source}
                    </span>
                  )}
                </>
              )}
            </button>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => current && speak(current.word)}>
                <Volume2 className="h-4 w-4" /> Listen
              </Button>
              <Button size="sm" variant="secondary" className="gap-2" onClick={() => next(false)}>
                <RotateCcw className="h-4 w-4" /> Again
              </Button>
              <Button size="sm" className="gap-2" onClick={() => next(true)}>
                <Check className="h-4 w-4" /> I know it
              </Button>
              <Button size="sm" variant="ghost" className="gap-2" onClick={shuffle}>
                <Shuffle className="h-4 w-4" /> Shuffle
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
