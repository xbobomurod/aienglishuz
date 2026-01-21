import { Mic, MicOff, RotateCcw, AlertCircle } from "lucide-react";
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
      startListening();
    }
  };

  const handleReset = () => {
    stopListening();
    resetTranscript();
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          size="lg"
          onClick={handleToggleRecording}
          className={cn(
            "gap-2 transition-all",
            isListening && "animate-pulse"
          )}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Recording
            </>
          )}
        </Button>
        
        {(speechTranscript || transcript) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleReset}
            title="Reset transcript"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Error: {error}</span>
        </div>
      )}

      {isListening && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-primary">Listening...</span>
          </div>
          
          {(speechTranscript || interimTranscript) && (
            <p className="text-sm text-muted-foreground">
              {speechTranscript}
              <span className="text-primary/60 italic">{interimTranscript}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
