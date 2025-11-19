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

type EmotionExpression = {
  gazeRange: number;
  blinkWindow: [number, number];
  blinkDuration: number;
  eyelidLift: number;
  pupilScale: number;
  eyebrowTilt: number;
  sparkle: number;
  irisGradient: string;
  pupilColor: string;
  glow: string;
  label: string;
};

const emotionExpressions: Record<Emotion, EmotionExpression> = {
  happy: {
    gazeRange: 6,
    blinkWindow: [1200, 2400],
    blinkDuration: 90,
    eyelidLift: 1,
    pupilScale: 1.08,
    eyebrowTilt: 10,
    sparkle: 0.75,
    irisGradient: "from-[#0b1725] via-[#0a1b2c] to-[#06111c]",
    pupilColor: "bg-teal-100",
    glow: "0 0 60px rgba(74,222,128,0.45)",
    label: "Upbeat",
  },
  thinking: {
    gazeRange: 4,
    blinkWindow: [2100, 3600],
    blinkDuration: 140,
    eyelidLift: 0.85,
    pupilScale: 0.95,
    eyebrowTilt: 4,
    sparkle: 0.45,
    irisGradient: "from-[#0a1522] via-[#07101a] to-[#04070c]",
    pupilColor: "bg-slate-50",
    glow: "0 0 50px rgba(125,211,252,0.35)",
    label: "Contemplative",
  },
  neutral: {
    gazeRange: 3.5,
    blinkWindow: [2400, 4200],
    blinkDuration: 120,
    eyelidLift: 0.92,
    pupilScale: 1,
    eyebrowTilt: 6,
    sparkle: 0.55,
    irisGradient: "from-[#08111c] via-[#060c14] to-[#03060b]",
    pupilColor: "bg-teal-200",
    glow: "0 0 45px rgba(94,234,212,0.3)",
    label: "Calm",
  },
  witty: {
    gazeRange: 5,
    blinkWindow: [1600, 3000],
    blinkDuration: 110,
    eyelidLift: 0.78,
    pupilScale: 0.9,
    eyebrowTilt: 14,
    sparkle: 0.65,
    irisGradient: "from-[#0a121d] via-[#060b12] to-[#03050a]",
    pupilColor: "bg-white",
    glow: "0 0 60px rgba(248,250,252,0.35)",
    label: "Witty",
  },
};

const easeSoft: [number, number, number, number] = [0.33, 0, 0.2, 1];

export const BmoFace = ({ mode, caption, compact, onWake, emotion = "neutral" }: BmoFaceProps) => {
  const expression = emotionExpressions[emotion];
  const [isBlinking, setIsBlinking] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const blinkTimeout = useRef<NodeJS.Timeout | null>(null);
  const gazeInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const scheduleBlink = () => {
      const delay = expression.blinkWindow[0] + Math.random() * (expression.blinkWindow[1] - expression.blinkWindow[0]);
      blinkTimeout.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), expression.blinkDuration);
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
    return () => {
      if (blinkTimeout.current) clearTimeout(blinkTimeout.current);
    };
  }, [expression.blinkWindow, expression.blinkDuration]);

  useEffect(() => {
    gazeInterval.current = setInterval(() => {
      setGaze({
        x: (Math.random() * expression.gazeRange - expression.gazeRange / 2) * (isBlinking ? 0 : 1),
        y: (Math.random() * expression.gazeRange - expression.gazeRange / 2) * (isBlinking ? 0 : 1),
      });
    }, 1900);

    return () => {
      if (gazeInterval.current) clearInterval(gazeInterval.current);
    };
  }, [expression.gazeRange, isBlinking]);

  const isListening = mode === "LISTENING" || mode === "SPEAKING";

  const eyeMotion = useMemo(
    () => ({
      scaleY: isBlinking ? 0.05 : expression.eyelidLift,
      transition: { duration: 0.12, ease: easeSoft },
    }),
    [isBlinking, expression.eyelidLift]
  );

  const eyelidShade = useMemo(
    () => ({
      opacity: isBlinking ? 0.55 : 0.18,
      transition: { duration: 0.18, ease: easeSoft },
    }),
    [isBlinking]
  );

  const irisMotion = useMemo(
    () => ({
      x: gaze.x,
      y: gaze.y,
      transition: { type: "spring" as const, stiffness: 60, damping: 11 },
    }),
    [gaze]
  );

  const pupilScale = useMemo(() => {
    let scale = expression.pupilScale;
    if (mode === "LISTENING") scale += 0.08;
    if (mode === "SPEAKING") scale += 0.12;
    if (mode === "PROCESSING") scale -= 0.05;
    return Math.max(0.7, scale);
  }, [expression.pupilScale, mode]);

  const sparkleMotion = useMemo(
    () => ({
      opacity: [0.15, expression.sparkle, 0.15],
      scale: [0.8, 1.05, 0.8],
      transition: { duration: 2.6, repeat: Infinity, ease: easeSoft },
    }),
    [expression.sparkle]
  );

  const eyebrowMotion = (side: "left" | "right") => ({
    rotate: (side === "left" ? -1 : 1) * expression.eyebrowTilt,
    y: isBlinking ? -2 : -6,
    transition: { duration: 0.3, ease: easeSoft },
  });

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
          <p className="text-sm uppercase tracking-[0.3em] text-sky-200/70">THINKING</p>
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
        className="flex items-center justify-center gap-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {["left", "right"].map((side) => (
          <motion.div
            key={side}
            className="relative h-24 w-24 rounded-full bg-[#04090f] shadow-[0_0_40px_rgba(57,214,193,0.25)]"
            animate={eyeMotion}
          >
            <motion.div
              className="absolute -top-5 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-white/15"
              animate={eyebrowMotion(side as "left" | "right")}
            />
            <motion.div
              className="absolute inset-0 origin-top rounded-full bg-gradient-to-b from-slate-900/80 via-slate-900/20 to-transparent"
              animate={eyelidShade}
            />
            <motion.div
              className={`absolute inset-3 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${expression.irisGradient}`}
              animate={irisMotion}
            >
              <motion.span
                className={`h-5 w-5 rounded-full ${expression.pupilColor}`}
                animate={{ scale: pupilScale }}
                transition={{ duration: 0.3, ease: easeSoft }}
              />
              <motion.span
                className="absolute -top-1 left-3 h-3 w-2 rounded-full bg-white/70"
                animate={sparkleMotion}
              />
            </motion.div>
            <div className="absolute inset-0 rounded-full border border-white/5" />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <motion.div
      layoutId="bmo-face"
      className={`glass-card neon-outline relative overflow-hidden ${compact ? "p-3" : "p-10"}`}
      style={{ minHeight: compact ? 140 : 320, boxShadow: expression.glow }}
    >
      {!compact && (
        <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-300/70">
          <span>AIU • Autonomous Guide</span>
          <span>{mode}</span>
        </div>
      )}

      {!compact && (
        <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-100/80">
          Mood: {expression.label}
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
