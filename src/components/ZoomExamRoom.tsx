import { useEffect, useRef, useState } from "react";
import { Video, VideoOff, Mic as MicIcon, MicOff, Volume2, Square, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import examinerImg from "@/assets/examiner.jpg";
import { supabase } from "@/integrations/supabase/client";

interface ZoomExamRoomProps {
  topic: string;
  taskLabel: string;
  examinerName?: string;
  autoSpeakTopic?: boolean;
  taskType?: "interview" | "talk" | "discussion";
}

type ChatMsg = { role: "user" | "assistant"; content: string };

/**
 * Zoom-style IELTS Speaking exam room.
 * - Local webcam tile (user)
 * - Examiner tile (avatar) with TTS speaking indicator
 * - Browser-native mic/camera controls, no recording uploads.
 */
export function ZoomExamRoom({ topic, taskLabel, examinerName = "Examiner Hannah", autoSpeakTopic, taskType = "interview" }: ZoomExamRoomProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Conversation state
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const historyRef = useRef<ChatMsg[]>([]);
  const [interim, setInterim] = useState("");
  const [thinking, setThinking] = useState(false);
  const thinkingRef = useRef(false);
  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);
  const [needsTapToContinue, setNeedsTapToContinue] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalBufRef = useRef("");
  const speakingRef = useRef(false);
  const micOnRef = useRef(true);
  const camOnRef = useRef(false);
  const shouldListenRef = useRef(false);
  const recognitionStartingRef = useRef(false);
  const sttSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Keep refs in sync with state so async callbacks read fresh values
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { thinkingRef.current = thinking; }, [thinking]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { listeningRef.current = listening; }, [listening]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { camOnRef.current = camOn; }, [camOn]);

  // Timer
  useEffect(() => {
    if (!camOn) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [camOn]);

  useEffect(() => {
    if (autoSpeakTopic) {
      startCamera();
    }
    return () => {
      try { audioRef.current?.pause(); } catch {}
      stopStream();
      stopRecognition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-greet when entering the room — ask AI for the first turn so it's natural
  const greetedRef = useRef(false);
  useEffect(() => {
    if (!autoSpeakTopic || !camOn || greetedRef.current) return;
    greetedRef.current = true;
    const t = setTimeout(() => {
      // Seed with a synthetic user "start" so AI produces the opener naturally
      askExaminer([{ role: "user", content: "[Candidate has just joined the video call. Greet them warmly and begin the exam.]" }], true);
    }, 700);
    return () => clearTimeout(t);
  }, [autoSpeakTopic, topic, camOn]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async () => {
    setStarting(true);
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamOn(true);
      setMicOn(true);
    } catch (e: any) {
      setErr(e?.message || "Could not access camera/microphone");
    } finally {
      setStarting(false);
    }
  };

  const endCall = () => {
    shouldListenRef.current = false;
    stopStream();
    stopRecognition();
    setCamOn(false);
    setElapsed(0);
    try { audioRef.current?.pause(); audioRef.current = null; } catch {}
    setSpeaking(false);
    setListening(false);
    setInterim("");
    setMicError(null);
    setNeedsTapToContinue(false);
    setHistory([]);
    historyRef.current = [];
    greetedRef.current = false;
  };

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
      micOnRef.current = track.enabled;
      if (track.enabled) {
        setMicError(null);
        setNeedsTapToContinue(false);
        startRecognition();
      } else {
        shouldListenRef.current = false;
        stopRecognition();
      }
    }
  };

  const speak = async (text: string) => {
    if (!text.trim()) return;
    // Don't listen to ourselves
    setSpeaking(true);
    speakingRef.current = true;
    stopRecognition();
    try { audioRef.current?.pause(); } catch {}
    try {
      const { data, error } = await supabase.functions.invoke("examiner-tts", { body: { text } });
      if (error || !data?.audioContent) throw error || new Error("No audio");
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      audioRef.current = audio;
      audio.onended = () => { speakingRef.current = false; setSpeaking(false); startRecognition(); };
      audio.onerror = () => { speakingRef.current = false; setSpeaking(false); startRecognition(); };
      await audio.play();
    } catch (e) {
      console.error("TTS failed", e);
      speakingRef.current = false;
      setSpeaking(false);
      startRecognition();
    }
  };

  const stopSpeaking = () => {
    try { audioRef.current?.pause(); } catch {}
    speakingRef.current = false;
    setSpeaking(false);
    startRecognition();
  };

  // ---- Speech recognition (STT) ----
  const startRecognition = () => {
    if (!sttSupported || !streamRef.current || !micOnRef.current) return;
    shouldListenRef.current = true;
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    // Never listen while examiner is speaking or thinking; resume automatically after that phase.
    if (speakingRef.current || thinkingRef.current) return;
    if (listeningRef.current || recognitionStartingRef.current) return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = recognitionRef.current || new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onstart = () => {
      recognitionStartingRef.current = false;
      setNeedsTapToContinue(false);
      setMicError(null);
      setListening(true);
    };
    rec.onend = () => {
      recognitionStartingRef.current = false;
      setListening(false);
      if (shouldListenRef.current && micOnRef.current && streamRef.current && !speakingRef.current && !thinkingRef.current) {
        restartTimerRef.current = setTimeout(() => startRecognition(), 350);
      }
    };
    rec.onerror = (event: any) => {
      recognitionStartingRef.current = false;
      setListening(false);
      const errorName = event?.error || "speech-recognition";
      if (errorName === "not-allowed" || errorName === "service-not-allowed") {
        shouldListenRef.current = false;
        setNeedsTapToContinue(true);
        setMicError("Microphone permission blocked. Tap Continue and allow microphone access.");
      } else if (errorName !== "no-speech" && errorName !== "aborted") {
        setMicError("I could not hear you clearly. Please speak again.");
      }
    };
    rec.onresult = (ev: any) => {
      // Ignore any stray results while examiner is speaking/thinking
      if (speakingRef.current || thinkingRef.current) return;
      let interimStr = "";
      let finalStr = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalStr += r[0].transcript + " ";
        else interimStr += r[0].transcript;
      }
      if (finalStr) {
        finalBufRef.current += finalStr;
        setInterim("");
      } else {
        setInterim(interimStr);
      }
      // Restart silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const text = (finalBufRef.current + interimStr).trim();
        if (text.length > 1 && !speakingRef.current && !thinkingRef.current) {
          finalBufRef.current = "";
          setInterim("");
          handleUserTurn(text);
        }
      }, 2800);
    };
    recognitionRef.current = rec;
    try {
      recognitionStartingRef.current = true;
      rec.start();
    } catch (e: any) {
      recognitionStartingRef.current = false;
      if (e?.name === "NotAllowedError") {
        shouldListenRef.current = false;
        setNeedsTapToContinue(true);
        setMicError("Tap Continue so the browser can restart microphone listening.");
      }
    }
  };

  const stopRecognition = () => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    recognitionStartingRef.current = false;
    try { recognitionRef.current?.stop?.(); } catch {}
    setListening(false);
  };

  const handleUserTurn = async (text: string) => {
    if (thinkingRef.current || speakingRef.current) return;
    stopRecognition();
    const next = [...historyRef.current, { role: "user" as const, content: text }];
    setHistory(next);
    await askExaminer(next, false);
  };

  const askExaminer = async (msgs: ChatMsg[], isOpener: boolean) => {
    setThinking(true);
    thinkingRef.current = true;
    stopRecognition();
    try {
      const { data, error } = await supabase.functions.invoke("examiner-chat", {
        body: { messages: msgs, taskType, topic },
      });
      if (error) throw error;
      const reply: string = (data?.reply || "").trim();
      if (!reply) throw new Error("No examiner reply");
      const nextHistory: ChatMsg[] = isOpener
        ? [{ role: "assistant", content: reply }]
        : [...msgs, { role: "assistant", content: reply }];
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      setThinking(false);
      thinkingRef.current = false;
      await speak(reply);
      return;
    } catch (e: any) {
      setErr(e?.message || "Examiner could not respond");
      setThinking(false);
      thinkingRef.current = false;
      startRecognition();
    }
  };

  const continueListening = async () => {
    setMicError(null);
    setNeedsTapToContinue(false);
    try {
      if (!streamRef.current) {
        await startCamera();
      } else if (!micOnRef.current) {
        const track = streamRef.current.getAudioTracks()[0];
        if (track) track.enabled = true;
        micOnRef.current = true;
        setMicOn(true);
      }
      startRecognition();
    } catch (e: any) {
      setMicError(e?.message || "Could not restart microphone listening.");
      setNeedsTapToContinue(true);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  const mmss = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div ref={containerRef} className="rounded-2xl overflow-hidden bg-[#1a1a1a] text-white shadow-2xl border border-white/10">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-black/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium">IELTS Speaking Room</span>
          <Badge variant="secondary" className="text-[10px] bg-white/10 text-white border-white/10">{taskLabel}</Badge>
          {thinking && <span className="text-[10px] text-white/60 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Examiner thinking…</span>}
          {listening && !thinking && !speaking && <span className="text-[10px] text-green-400 flex items-center gap-1"><MicIcon className="w-3 h-3" /> Listening…</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-white/70">{mmss(elapsed)}</span>
          <button onClick={toggleFullscreen} className="text-white/70 hover:text-white">
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-[#0f0f0f]">
        {/* Examiner tile */}
        <div className={cn(
          "relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center",
          speaking && "ring-2 ring-green-400 ring-offset-2 ring-offset-[#0f0f0f]"
        )}>
          <img
            src={examinerImg}
            alt={examinerName}
            className={cn("w-full h-full object-cover transition-transform duration-300", speaking && "scale-[1.02]")}
          />
          {/* Speaking equalizer */}
          {speaking && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-end gap-1 h-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-1 bg-green-400 rounded-full animate-pulse"
                  style={{ height: `${20 + ((i * 7) % 20)}px`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="px-2 py-0.5 rounded bg-black/60 text-xs font-medium">{examinerName}</span>
            <span className="px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-green-400">● Live</span>
          </div>
        </div>

        {/* User tile */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn("w-full h-full object-cover -scale-x-100", !camOn && "opacity-0")}
          />
          {!camOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-3">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold">
                You
              </div>
              {!streamRef.current && (
                <Button
                  onClick={startCamera}
                  disabled={starting}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {starting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Video className="w-4 h-4 mr-1" />}
                  Join with camera
                </Button>
              )}
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="px-2 py-0.5 rounded bg-black/60 text-xs font-medium">You (Candidate)</span>
            {!micOn && <span className="px-1.5 py-0.5 rounded bg-red-500/80 text-[10px]">Muted</span>}
          </div>
        </div>
      </div>

      {/* Live transcript log */}
      <div className="px-4 py-3 bg-black/40 border-t border-white/5 max-h-44 overflow-y-auto space-y-2 text-sm">
        {history.length === 0 && !interim && (
          <p className="text-xs text-white/40 italic">The examiner will greet you when you join with camera. Just speak naturally — she will listen and respond.</p>
        )}
        {history.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "rounded-lg px-3 py-1.5 max-w-[80%] leading-snug",
              m.role === "user" ? "bg-blue-500/20 text-blue-100" : "bg-white/10 text-white/90"
            )}>
              <span className="text-[10px] uppercase tracking-wider opacity-60 block">{m.role === "user" ? "You" : examinerName}</span>
              {m.content}
            </div>
          </div>
        ))}
        {interim && (
          <div className="flex justify-end">
            <div className="rounded-lg px-3 py-1.5 max-w-[80%] bg-blue-500/10 text-blue-200/80 italic">{interim}…</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 px-3 py-3 bg-[#1a1a1a] border-t border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={streamRef.current ? toggleMic : undefined}
          disabled={!streamRef.current}
          className={cn("rounded-full h-11 w-11 p-0", micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white hover:bg-red-600")}
          title={micOn ? "Mute mic" : "Unmute"}
        >
          {micOn ? <MicIcon className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={streamRef.current ? toggleCam : startCamera}
          disabled={starting}
          className={cn("rounded-full h-11 w-11 p-0", camOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white hover:bg-red-600")}
          title={camOn ? "Stop video" : "Start video"}
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            if (speaking) { stopSpeaking(); return; }
            const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
            speak(lastAssistant?.content || topic || "Could you please introduce yourself?");
          }}
          className={cn("rounded-full h-11 px-4 gap-2", speaking ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20")}
          title="Replay last examiner turn"
        >
          {speaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
          <span className="text-xs">{speaking ? "Stop" : "Replay"}</span>
        </Button>
        {camOn && (
          <Button
            variant="ghost"
            size="sm"
            onClick={endCall}
            className="rounded-full h-11 px-4 bg-red-500 hover:bg-red-600 text-white"
          >
            Leave
          </Button>
        )}
      </div>

      {err && (
        <div className="px-4 py-2 bg-red-500/20 text-red-200 text-xs border-t border-red-500/30">
          {err}. Allow camera & microphone permissions to start the exam room.
        </div>
      )}
      {!sttSupported && camOn && (
        <div className="px-4 py-2 bg-yellow-500/20 text-yellow-100 text-xs border-t border-yellow-500/30">
          Your browser does not support live speech recognition. Use Chrome or Edge for the full conversational examiner.
        </div>
      )}
    </div>
  );
}
