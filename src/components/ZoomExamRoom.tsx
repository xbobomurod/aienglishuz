import { useEffect, useRef, useState } from "react";
import { Video, VideoOff, Mic as MicIcon, MicOff, Volume2, Square, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import examinerImg from "@/assets/examiner.jpg";

interface ZoomExamRoomProps {
  topic: string;
  taskLabel: string;
  examinerName?: string;
  autoSpeakTopic?: boolean;
}

/**
 * Zoom-style IELTS Speaking exam room.
 * - Local webcam tile (user)
 * - Examiner tile (avatar) with TTS speaking indicator
 * - Browser-native mic/camera controls, no recording uploads.
 */
export function ZoomExamRoom({ topic, taskLabel, examinerName = "Examiner Hannah", autoSpeakTopic }: ZoomExamRoomProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Timer
  useEffect(() => {
    if (!camOn) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [camOn]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) setTtsSupported(false);
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
      stopStream();
    };
  }, []);

  // Auto-greet when entering the room
  const greetedRef = useRef(false);
  useEffect(() => {
    if (!autoSpeakTopic || !camOn || greetedRef.current) return;
    greetedRef.current = true;
    const greeting = "Good morning! My name is Hannah, and I'll be your IELTS examiner today. Could you tell me your full name, please?";
    const question = topic ? ` Thank you. Now, let's begin. ${topic}` : "";
    const t = setTimeout(() => speak(greeting + question), 900);
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
    stopStream();
    setCamOn(false);
    setElapsed(0);
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeaking(false);
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
    }
  };

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => /en[-_]GB/i.test(v.lang) && /female|samantha|kate|serena|martha|amelia|hazel/i.test(v.name)) ||
      voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
      voices.find((v) => /en/i.test(v.lang))
    );
  };

  const speak = (text: string) => {
    if (!ttsSupported || !text.trim()) return;
    try { window.speechSynthesis.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || "en-GB";
    u.rate = 0.95;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const stopSpeaking = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    setSpeaking(false);
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

      {/* Question banner */}
      {topic && (
        <div className="px-4 py-3 bg-black/40 border-t border-white/5">
          <div className="flex items-start gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/50 mt-1">Examiner says</span>
            <p className="text-sm text-white/90 flex-1 leading-relaxed whitespace-pre-wrap">{topic}</p>
          </div>
        </div>
      )}

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
          onClick={() => (speaking ? stopSpeaking() : speak(topic || "Could you please introduce yourself?"))}
          disabled={!ttsSupported || !topic}
          className={cn("rounded-full h-11 px-4 gap-2", speaking ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20")}
          title="Replay examiner question"
        >
          {speaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
          <span className="text-xs">{speaking ? "Stop" : "Examiner"}</span>
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
    </div>
  );
}
