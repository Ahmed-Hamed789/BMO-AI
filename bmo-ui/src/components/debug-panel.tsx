"use client";

import { RobotMode } from "@/lib/robot";
import { motion, AnimatePresence } from "framer-motion";
import { BugPlay, X } from "lucide-react";

interface DebugPanelProps {
  mode: RobotMode;
  visible: boolean;
  onToggle: () => void;
  onModeChange: (mode: RobotMode) => void;
  onReset: () => void;
}

const modes: RobotMode[] = [
  "IDLE",
  "LISTENING",
  "PROCESSING",
  "SPEAKING",
  "NAVIGATING",
];

export const DebugPanel = ({
  mode,
  visible,
  onToggle,
  onModeChange,
  onReset,
}: DebugPanelProps) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={onToggle}
        className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 text-slate-200 transition hover:border-teal-300/60"
      >
        {visible ? <X size={18} /> : <BugPlay size={18} />}
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="glass-card mt-4 w-60 rounded-3xl border border-white/10 p-4"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-400">
              Debug
            </p>
            <div className="flex flex-wrap gap-2">
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => onModeChange(m)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    m === mode
                      ? "bg-teal-400/20 text-teal-200"
                      : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={onReset}
              className="mt-4 w-full rounded-2xl border border-white/10 py-2 text-sm font-semibold text-white transition hover:border-teal-200"
            >
              Reset Flow
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebugPanel;
