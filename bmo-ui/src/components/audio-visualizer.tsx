"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

type AudioVisualizerProps = {
  variant: "listening" | "speaking";
};

export const AudioVisualizer = ({ variant }: AudioVisualizerProps) => {
  const bars = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  return (
    <div className="flex h-28 w-full items-end justify-center gap-[3px] overflow-hidden">
      {bars.map((bar) => (
        <motion.span
          key={bar}
          className="w-[6px] rounded-full bg-gradient-to-b from-teal-300/80 to-sky-500/90"
          animate={{
            height:
              variant === "listening"
                ? ["45%", "90%", "60%", "80%"]
                : ["35%", "100%", "50%", "85%"],
            opacity: [0.5, 1, 0.7, 0.9],
          }}
          transition={{
            duration: 1.8 + (bar % 5) * 0.05,
            repeat: Infinity,
            repeatType: "mirror",
            delay: bar * 0.02,
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
