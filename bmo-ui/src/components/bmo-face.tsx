"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AudioVisualizer from "./audio-visualizer";
import { RobotMode } from "@/lib/robot";
import type { Emotion } from "@/lib/api";

interface BmoFaceProps {
  mode: RobotMode;
  caption: string;
  compact?: boolean;
  onWake: () => void;
  emotion?: Emotion;
}

const gazeRange = 4;

const emotionGlows: Record<Emotion, string> = {
  happy: "0 0 60px rgba(74,222,128,0.45)",
  thinking: "0 0 50px rgba(125,211,252,0.4)",
  neutral: "0 0 45px rgba(94,234,212,0.35)",
  witty: "0 0 60px rgba(248,250,252,0.35)",
};

const emotionCopy: Record<Emotion, string> = {
  happy: "Upbeat",
  thinking: "Contemplative",
  neutral: "Calm",
  witty: "Witty",
};

export const BmoFace = ({ mode, caption, compact, onWake, emotion = "neutral" }: BmoFaceProps) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const blinkTimeout = useRef<NodeJS.Timeout | null>(null);
  const gazeInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const scheduleBlink = () => {
      blinkTimeout.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 120);
        scheduleBlink();
      }, 1800 + Math.random() * 4000);
    };

    scheduleBlink();

    return () => {
      if (blinkTimeout.current) clearTimeout(blinkTimeout.current);
    };
  }, []);

  useEffect(() => {
    gazeInterval.current = setInterval(() => {
      setGaze({
        x: (Math.random() * gazeRange - gazeRange / 2) * (isBlinking ? 0 : 1),
        y: (Math.random() * gazeRange - gazeRange / 2) * (isBlinking ? 0 : 1),
      });
    }, 2200);

    return () => {
      if (gazeInterval.current) clearInterval(gazeInterval.current);
    };
  }, [isBlinking]);

  const isListening = mode === "LISTENING" || mode === "SPEAKING";

  const eyeLids = useMemo(
    () => ({
      scaleY: isBlinking ? 0.05 : 1,
      transition: { duration: 0.12 },
    }),
    [isBlinking]
  );

  const irisMotion = useMemo(
    () => ({
      x: gaze.x,
      y: gaze.y,
      transition: { type: "spring", stiffness: 60, damping: 10 } as const,
    }),
    [gaze]
  );

  const faceContent = () => {
    if (mode === "PROCESSING") {
      return (
        <motion.div
          key="processing"
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-500/80 to-teal-300/80"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
          <p className="text-sm uppercase tracking-[0.3em] text-sky-200/70">
            THINKING
          </p>
        </motion.div>
      );
    }

    if (isListening) {
      return (
        <motion.div
          key="visualizer"
          className="w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AudioVisualizer variant={mode === "LISTENING" ? "listening" : "speaking"} />
          {mode === "SPEAKING" && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-sky-100/80">
              <Volume2 size={16} />
              <p className="text-center max-w-md text-balance opacity-90">{caption}</p>
            </div>
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        key="eyes"
        className="flex items-center justify-center gap-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {[0, 1].map((eye) => (
          <motion.div
            key={eye}
            className="relative h-24 w-24 rounded-full bg-[#08101b] shadow-[0_0_40px_rgba(57,214,193,0.25)]"
            animate={eyeLids}
          >
            <motion.div
              className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
              animate={irisMotion}
            >
              <span className="h-4 w-4 rounded-full bg-teal-200" />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <motion.div
      layoutId="bmo-face"
      className={`glass-card neon-outline relative overflow-hidden ${
        compact ? "p-3" : "p-10"
      }`}
      style={{
        minHeight: compact ? 140 : 320,
        boxShadow: emotionGlows[emotion],
      }}
    >
      {!compact && (
        <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-300/70">
          <span>AIU • Autonomous Guide</span>
          <span>{mode}</span>
        </div>
      )}

      {!compact && (
        <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-100/80">
          Mood: {emotionCopy[emotion]}
        </div>
      )}

      <AnimatePresence mode="wait">{faceContent()}</AnimatePresence>

      {!compact && mode === "IDLE" && (
        <button
          onClick={onWake}
          className="group mt-10 flex w-full items-center justify-center gap-3 rounded-full border border-teal-300/60 bg-transparent py-4 text-lg font-semibold text-teal-100 transition hover:bg-teal-300/10"
        >
          <Mic className="text-teal-200 transition group-hover:scale-110" size={20} />
          Wake BMO
        </button>
      )}
    </motion.div>
  );
};

export default BmoFace;
