import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExaminerVoiceProps {
  text: string;
  label?: string;
  className?: string;
  autoPlay?: boolean;
}

/**
 * Plays the given text aloud with a British English voice when available,
 * mimicking the audio cue of a real Computer-Delivered IELTS examiner.
 */
export function ExaminerVoice({ text, label = "Listen to examiner", className, autoPlay }: ExaminerVoiceProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
    }
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => /en[-_]GB/i.test(v.lang) && /female|samantha|kate|serena|martha|amelia/i.test(v.name)) ||
      voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
      voices.find((v) => /en/i.test(v.lang))
    );
  };

  const speak = () => {
    if (!supported || !text.trim()) return;
    try { window.speechSynthesis.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || "en-GB";
    u.rate = 0.95;
    u.pitch = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const stop = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    setSpeaking(false);
  };

  useEffect(() => {
    if (autoPlay && text.trim()) {
      const t = setTimeout(speak, 400);
      return () => clearTimeout(t);
    }
  }, [autoPlay, text]);

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={speaking ? "destructive" : "outline"}
      size="sm"
      onClick={speaking ? stop : speak}
      disabled={!text.trim()}
      className={cn("gap-2", className)}
    >
      {speaking ? (
        <>
          <Square className="w-3.5 h-3.5 fill-current" />
          Stop
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}
