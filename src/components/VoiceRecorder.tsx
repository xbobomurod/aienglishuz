import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, RotateCcw, AlertCircle, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string) => void;
  transcript: string;
}

export function VoiceRecorder({ onTranscriptChange, transcript }: VoiceRecorderProps) {
  const {
    isListening,
    transcript: speechTranscript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error
  } = useSpeechRecognition();

  const [recordingTime, setRecordingTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isListening) {
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isListening]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = () => {
    if (isListening) {
      stopListening();
      // Merge final transcript with what's in the text area
      if (speechTranscript.trim()) {
        const newTranscript = transcript 
          ? `${transcript} ${speechTranscript.trim()}`
          : speechTranscript.trim();
        onTranscriptChange(newTranscript);
        resetTranscript();
      }
    } else {
      setRecordingTime(0);
      startListening();
    }
  };

  const handleReset = () => {
    stopListening();
    resetTranscript();
    setRecordingTime(0);
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs sm:text-sm">Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Recording Controls - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant={isListening ? "destructive" : "default"}
          size="lg"
          onClick={handleToggleRecording}
          className={cn(
            "gap-2 transition-all flex-1 sm:flex-none h-14 sm:h-11 text-base sm:text-sm",
            isListening && "animate-pulse"
          )}
        >
          {isListening ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Recording</span>
              <span className="ml-2 font-mono bg-destructive-foreground/20 px-2 py-0.5 rounded text-sm">
                {formatTime(recordingTime)}
              </span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Start Recording</span>
            </>
          )}
        </Button>
        
        {(speechTranscript || transcript) && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleReset}
            title="Reset transcript"
            className="gap-2 h-12 sm:h-11 sm:w-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="sm:hidden">Reset</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Live Recording Feedback */}
      {isListening && (
        <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border-2 border-primary/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-primary">Recording...</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {formatTime(recordingTime)}
            </span>
          </div>
          
          {(speechTranscript || interimTranscript) ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {speechTranscript}
              <span className="text-primary/60 italic">{interimTranscript}</span>
            </p>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Listening for speech...</span>
            </div>
          )}
        </div>
      )}

      {/* Mobile Tips */}
      {!isListening && !transcript && (
        <div className="p-2 sm:p-3 rounded-lg bg-secondary/50 text-xs sm:text-sm text-muted-foreground">
          <p className="font-medium mb-1">💡 Recording Tips:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Speak clearly and at a natural pace</li>
            <li>Keep your device close to your mouth</li>
            <li>Minimize background noise</li>
          </ul>
        </div>
      )}
    </div>
  );
}
