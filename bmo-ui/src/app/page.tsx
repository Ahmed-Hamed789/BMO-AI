"use client";

import { motion } from "framer-motion";
import { Compass, GraduationCap, MapPinned, Mic, PauseCircle, Utensils } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import BmoFace from "@/components/bmo-face";
import CommandGrid from "@/components/command-grid";
import DebugPanel from "@/components/debug-panel";
import NavigationPanel from "@/components/navigation-panel";
import { sendTranscript, wakeSession } from "@/lib/api";
import { RobotMode } from "@/lib/robot";

const commandPresets = {
  highlights: {
    label: "Campus Highlights",
    description: "Studio + AI showcase tour",
    icon: Compass,
    prompt:
      "Guide the visitor through the engineering studios, AI courtyard, and innovation wall with energetic narration.",
    destination: "Engineering Studios",
    narration:
      "Hi! I’m BMO. Let me walk you through the creative studios, then we’ll cut through the courtyard to reach the Applied AI wing.",
    directions: [
      "Glide past the Innovation Wall",
      "Turn right after the Interactive Dome",
      "Take the lift to Level 2",
      "Arrive at the Engineering Studios",
    ],
  },
  dean: {
    label: "Find Dean’s Office",
    description: "Navigate guests to the executive suite",
    icon: GraduationCap,
    prompt: "Lead the visitor from the main lobby to the Dean’s Office on Level 2 near the executive suite.",
    destination: "Dean’s Office",
    narration:
      "Routing you to the Dean’s office. We’ll pass the digital atrium, then climb a single flight to the executive suite.",
    directions: [
      "Head straight for 25 meters",
      "Turn left at the floating directory",
      "Take the stairs up one level",
      "Dean’s office is on your right",
    ],
  },
  wc: {
    label: "Restrooms",
    description: "Fast route to nearest facilities",
    icon: MapPinned,
    prompt: "Direct the visitor to the closest accessible restrooms in the north wing.",
    destination: "North Wing Facilities",
    narration:
      "Restrooms ahead. I’ll take the quieter northern hallway so we skip the current club rush.",
    directions: [
      "Follow the illuminated floor path",
      "Keep right at the indoor garden",
      "Facilities door will be 5 meters ahead",
    ],
  },
  cafe: {
    label: "Guide to Cafeteria",
    description: "Ideal for lunch rush",
    icon: Utensils,
    prompt: "Walk the guest from the innovation hub down to the terrace café with scenic commentary.",
    destination: "Cafeteria Terrace",
    narration:
      "Delivering you to the terrace café. Their cardamom latte just won the campus award.",
    directions: [
      "Descend the ramp beside the media lab",
      "Cross the kinetic bridge",
      "Exit onto the terrace",
      "Café entrance is on the left",
    ],
  },
} as const;

type CommandKey = keyof typeof commandPresets;

const modeAccent: Record<RobotMode, string> = {
  IDLE: "text-slate-300",
  LISTENING: "text-sky-200",
  PROCESSING: "text-amber-200",
  SPEAKING: "text-teal-200",
  NAVIGATING: "text-emerald-200",
  ERROR: "text-rose-300",
};

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export default function Home() {
  const [mode, setMode] = useState<RobotMode>("IDLE");
  const [caption, setCaption] = useState<string>(commandPresets.highlights.narration);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [destination, setDestination] = useState<string>(commandPresets.highlights.destination);
  const [instructions, setInstructions] = useState<string[]>([...commandPresets.highlights.directions]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [clientReady, markClientReady] = useReducer(() => true, false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
  markClientReady();
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          recognitionRef.current.stop();
        }
        recognitionRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (!clientReady || typeof window === "undefined" || typeof navigator === "undefined") {
      return undefined;
    }
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [clientReady]);

  const playSpeech = useCallback((base64?: string, mime?: string) => {
    if (!base64) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(`data:${mime ?? "audio/mpeg"};base64,${base64}`);
    audioRef.current = audio;
    audio.play().catch(() => undefined);
  }, []);

  const createSession = useCallback(async () => {
    setError(null);
    setMode("PROCESSING");
    const wake = await wakeSession();
    setSessionId(wake.session_id);
    setCaption(wake.message);
    setMode("LISTENING");
    return wake.session_id;
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    return createSession();
  }, [sessionId, createSession]);

  const applyNavigation = useCallback(
    (
      payload: {
        narration?: string;
        destination?: string;
        directions?: string[];
        mode?: string;
        speech?: { mime_type: string; base64: string };
      },
      fallbackKey?: CommandKey
    ) => {
      const fallback = fallbackKey ? commandPresets[fallbackKey] : null;
      setCaption(payload.narration || fallback?.narration || "Let me find that for you.");

      let resolvedDirections: string[] = [];
      if (payload.directions && payload.directions.length) {
        resolvedDirections = [...payload.directions];
      } else if (fallback?.directions?.length) {
        resolvedDirections = [...fallback.directions];
      }

      setInstructions(resolvedDirections);
      setDestination(payload.destination || fallback?.destination || destination);

      const nextMode: RobotMode = resolvedDirections.length > 0 || payload.mode === "NAVIGATING"
        ? "NAVIGATING"
        : "SPEAKING";
      setMode(nextMode);
      playSpeech(payload.speech?.base64, payload.speech?.mime_type);
    },
    [destination, playSpeech]
  );

  const processTranscript = useCallback(
    async (id: string, transcript: string, fallbackKey?: CommandKey) => {
      setError(null);
      setMode("PROCESSING");
      try {
        const payload = await sendTranscript(id, transcript);
        applyNavigation(payload, fallbackKey);
      } catch (err) {
        if (fallbackKey) {
          const fallback = commandPresets[fallbackKey];
          setCaption(fallback.narration);
          setDestination(fallback.destination);
          setInstructions([...fallback.directions]);
          setMode("NAVIGATING");
        } else {
          setError(err instanceof Error ? err.message : "Could not reach backend");
          setMode("ERROR");
        }
      }
    },
    [applyNavigation]
  );

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        recognitionRef.current.abort();
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript("");
  }, []);

  const startRecognition = useCallback(() => {
    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setError("Speech recognition is only supported in Chrome-based browsers.");
      setMode("ERROR");
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Chrome requires HTTPS (or localhost) to start speech recognition.");
      setMode("ERROR");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("You're offline. Reconnect to the internet to use speech recognition.");
      setMode("ERROR");
      return;
    }

    const sessionPromise = ensureSession();
    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const handleSessionFailure = (err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not reach backend session");
      setMode("ERROR");
      stopRecognition();
    };

    sessionPromise.catch(handleSessionFailure);

    recognition.onresult = async (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alternative = result[0] ?? result.item(0);
        if (!alternative) continue;
        const transcript = alternative.transcript;
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          setInterimTranscript(transcript);
        }
      }

      if (finalTranscript.trim()) {
        const clean = finalTranscript.trim();
        setInterimTranscript("");
        setLastTranscript(clean);
        setIsRecording(false);
        recognition.stop();
        try {
          const id = await sessionPromise;
          await processTranscript(id, clean);
        } catch (err) {
          handleSessionFailure(err);
        }
      }
    };

    recognition.onerror = (event) => {
      let detail: string;
      switch (event.error) {
        case "not-allowed":
          detail = "Microphone permission denied";
          break;
        case "network":
          detail = "Chrome Web Speech hit a network error. Ensure you're online and using HTTPS/localhost.";
          break;
        default:
          detail = event.error ? `Speech recognition error: ${event.error}` : "Speech recognition failed";
      }
      setError(detail);
      setMode("ERROR");
      stopRecognition();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsRecording(false);
      setInterimTranscript("");
    };

    setError(null);
    setMode("LISTENING");
    setIsRecording(true);
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      handleSessionFailure(err);
    }
  }, [ensureSession, processTranscript, stopRecognition]);

  const handleMicToggle = () => {
    if (isRecording) {
      stopRecognition();
      return;
    }
    startRecognition();
  };

  const handleQuickCommand = useCallback(
    async (key: CommandKey) => {
      if (mode === "PROCESSING") return;
      const preset = commandPresets[key];
      const id = await ensureSession();
      setLastTranscript(preset.prompt);
      await processTranscript(
        id,
        `Visitor quick command (${preset.label}): ${preset.prompt}`,
        key
      );
    },
    [ensureSession, mode, processTranscript]
  );

  const handleWake = useCallback(async () => {
    await createSession();
  }, [createSession]);

  const handleStop = useCallback(() => {
    stopRecognition();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setMode("IDLE");
    setCaption("Standing by for the next request.");
    setInstructions([]);
    setError(null);
  }, [stopRecognition]);

  const quickCommands = useMemo(
    () =>
      (Object.entries(commandPresets) as [CommandKey, (typeof commandPresets)[CommandKey]][]).map(
        ([key, preset]) => ({
          label: preset.label,
          description: preset.description,
          icon: preset.icon,
          onSelect: () => handleQuickCommand(key),
        })
      ),
    [handleQuickCommand]
  );

  const speechSupported = clientReady && Boolean(getSpeechRecognitionConstructor());
  const secureContext = clientReady ? window.isSecureContext : true;
  const micDisabled =
    !clientReady || mode === "PROCESSING" || !speechSupported || !secureContext || !isOnline;

  const handleModeOverride = (nextMode: RobotMode) => {
    stopRecognition();
    if (nextMode === "NAVIGATING" && instructions.length === 0) {
      setInstructions([...commandPresets.highlights.directions]);
      setDestination(commandPresets.highlights.destination);
    }
    setMode(nextMode);
  };

  return (
    <main className="min-h-screen w-full px-4 py-8 text-white sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row">
        <motion.section
          layout
          className={`flex flex-1 flex-col gap-6 ${
            mode === "NAVIGATING" ? "lg:max-w-sm" : "lg:max-w-3xl"
          }`}
        >
          <motion.div
            layout
            className={`w-full ${mode === "NAVIGATING" ? "lg:max-w-[360px]" : "lg:max-w-full"}`}
          >
            <BmoFace mode={mode} caption={caption} compact={mode === "NAVIGATING"} onWake={handleWake} />
          </motion.div>

          <div className="glass-card flex flex-col gap-4 rounded-[32px] p-6 text-sm text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.4em]">
              <span>Session {sessionId ?? "—"}</span>
              <span className={`flex items-center gap-2 font-semibold ${modeAccent[mode]}`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {mode}
              </span>
            </div>
            <p className="text-base text-slate-100">{caption}</p>
            {(interimTranscript || lastTranscript) && (
              <p className="text-xs text-slate-400">
                Last request: {interimTranscript ? `${interimTranscript}…` : lastTranscript}
              </p>
            )}
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
              onClick={handleMicToggle}
              disabled={micDisabled}
              className={`group flex items-center justify-center gap-3 rounded-3xl border border-white/10 py-4 text-lg font-semibold transition ${
                isRecording
                  ? "bg-rose-500/20 text-rose-100"
                  : micDisabled
                  ? "bg-white/5 text-white/70 cursor-not-allowed"
                  : "bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {isRecording ? <PauseCircle className="text-rose-200" /> : <Mic className="text-teal-200" />}
              {isRecording
                ? "Tap to stop listening"
                : micDisabled
                ? "Speech recognition unavailable"
                : "Tap to speak with BMO"}
            </button>
            {clientReady && !speechSupported && (
              <p className="text-xs text-amber-200">
                Use the desktop version of Chrome/Edge to enable the Web Speech API.
              </p>
            )}
            {!isOnline && (
              <p className="text-xs text-rose-300">You appear offline. Reconnect to keep speaking with BMO.</p>
            )}
            {clientReady && !secureContext && (
              <p className="text-xs text-amber-200">
                Speech recognition requires HTTPS or localhost in Chrome.
              </p>
            )}
          </div>

          {mode !== "NAVIGATING" && <CommandGrid commands={quickCommands} />}
        </motion.section>

        <motion.section layout className="flex-1">
          {mode === "NAVIGATING" ? (
            <NavigationPanel
              mode={mode}
              destination={destination}
              instructions={instructions}
              onStop={handleStop}
            />
          ) : (
            <div className="glass-card flex h-full flex-col items-start justify-between gap-6 rounded-[32px] p-8 text-slate-200">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Flow</p>
                <h2 className="text-4xl font-semibold text-white">Voice + Map Fusion</h2>
                <p className="mt-3 max-w-md text-slate-300">
                  Wake BMO, hold the mic in Chrome, or trigger a quick command to see the Chrome Web Speech →
                  OpenRouter → TTS pipeline animate across the interface.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                <span className="rounded-2xl border border-white/10 px-4 py-2">
                  Idle ➜ Listening ➜ Thinking ➜ Speaking ➜ Navigation
                </span>
                <span className="rounded-2xl border border-white/10 px-4 py-2">Swagger docs at /docs</span>
                <span className="rounded-2xl border border-white/10 px-4 py-2">
                  Stack: Chrome Web Speech STT + FastAPI + OpenRouter + OpenAI TTS
                </span>
              </div>
            </div>
          )}
        </motion.section>
      </div>

      <DebugPanel
        mode={mode}
        visible={debugOpen}
        onToggle={() => setDebugOpen((prev) => !prev)}
        onModeChange={handleModeOverride}
        onReset={handleStop}
      />
    </main>
  );
}
