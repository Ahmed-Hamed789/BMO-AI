"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface CommandItem {
  label: string;
  description: string;
  icon: LucideIcon;
  onSelect: () => void;
}

interface CommandGridProps {
  commands: CommandItem[];
}

export const CommandGrid = ({ commands }: CommandGridProps) => {
  return (
    <div className="grid w-full gap-4 md:grid-cols-2">
      {commands.map((command, idx) => (
        <motion.button
          key={command.label}
          onClick={command.onSelect}
          whileTap={{ scale: 0.98 }}
          className="glass-card group flex h-32 flex-col items-start gap-3 rounded-3xl border border-white/10 p-5 text-left transition hover:border-teal-200/40"
        >
          <div className="flex items-center gap-3 text-lg font-semibold text-white">
            <command.icon className="text-teal-200 transition group-hover:scale-110" />
            {command.label}
          </div>
          <p className="text-sm text-slate-300/90">{command.description}</p>
          <motion.span
            className="text-xs uppercase tracking-[0.4em] text-teal-200/60"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2, delay: idx * 0.1 }}
          >
            tap to guide
          </motion.span>
        </motion.button>
      ))}
    </div>
  );
};

export default CommandGrid;
