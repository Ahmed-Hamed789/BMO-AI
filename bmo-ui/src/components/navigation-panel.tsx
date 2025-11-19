"use client";

import { motion } from "framer-motion";
import { CircleAlert, MapPin, StopCircle } from "lucide-react";
import { RobotMode } from "@/lib/robot";
import type { NavigationDisplay } from "@/lib/api";

interface NavigationPanelProps {
  mode: RobotMode;
  instructions: string[];
  destination: string;
  onStop: () => void;
  navigationMeta?: NavigationDisplay | null;
}

export const NavigationPanel = ({
  mode,
  instructions,
  destination,
  onStop,
  navigationMeta,
}: NavigationPanelProps) => {
  if (mode !== "NAVIGATING") return null;

  const zoneAccent: Record<string, string> = {
    Yellow: "from-amber-400/20 via-amber-900/20 to-amber-900/60 text-amber-100",
    Red: "from-rose-400/20 via-rose-900/20 to-rose-900/60 text-rose-100",
    Blue: "from-sky-400/20 via-sky-900/20 to-sky-900/60 text-sky-100",
  };

  const zoneLabel = navigationMeta?.zone_color ?? "Yellow";
  const badgeClass = zoneAccent[zoneLabel] ?? "from-emerald-400/20 via-emerald-900/20 to-emerald-900/60 text-emerald-100";

  return (
    <div className="flex h-full flex-col gap-4 rounded-[32px] bg-gradient-to-br from-[#0c1627] to-[#050a12] p-6 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Guiding</p>
          <h2 className="text-3xl font-semibold text-white">{destination}</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1 text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
          Active
        </div>
      </div>

      {navigationMeta && (
        <div className="glass-card grid gap-4 rounded-3xl border border-white/5 p-4 text-sm text-slate-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Zone</p>
              <p className="text-xl font-semibold text-white">{zoneLabel} Zone</p>
            </div>
            <span className={`rounded-full bg-gradient-to-r ${badgeClass} px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]`}>
              Library Anchor
            </span>
          </div>
          <p className="text-base text-slate-100">{navigationMeta.direction_guide}</p>
        </div>
      )}

      <div className="relative mt-4 flex-1 overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 via-slate-900/10 to-black/80">
        <motion.div
          className="absolute inset-6 rounded-3xl border border-slate-700/40"
          animate={{ rotate: [0, 1.5, -1, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/4 top-1/3 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300"
          animate={{ y: [0, 10, -5, 0], x: [0, 8, -8, 0] }}
          transition={{ repeat: Infinity, duration: 8 }}
        />
        <motion.div
          className="absolute right-1/5 bottom-1/4 h-4 w-4 rounded-full border-2 border-teal-200"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ repeat: Infinity, duration: 3 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(57,214,193,0.15)_0%,_rgba(6,10,20,0.9)_70%)]" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {instructions.map((step, index) => (
          <motion.div
            key={`${index}-${step}`}
            className="glass-card flex items-center gap-4 rounded-2xl border border-white/5 px-4 py-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/80 text-sky-200">
              <MapPin />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Step {index + 1}</p>
              <p className="text-lg font-semibold text-white">{step}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onStop}
        className="group flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-rose-500 to-orange-500 py-5 text-xl font-semibold text-white shadow-[0_20px_45px_rgba(244,63,94,0.35)] transition hover:opacity-90"
      >
        <StopCircle className="text-white group-hover:scale-110" />
        Emergency Stop
      </button>

      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-rose-200/70">
        <CircleAlert size={16} /> Tap to return to idle
      </p>
    </div>
  );
};

export default NavigationPanel;
