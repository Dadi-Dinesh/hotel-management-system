"use client";

import { motion } from "framer-motion";
import { BellRing, Droplets, PackagePlus, Sparkles } from "lucide-react";

// Every preset sends the exact same existing "call-waiter" socket signal —
// only the local label/toast differs. The waiter dashboard keeps receiving
// the identical generic alert it always has; no socket payload changes.
const PRESETS = [
  { key: "water", label: "Bring Water", toast: "💧 Water requested! A waiter is on the way.", Icon: Droplets },
  { key: "tissue", label: "Need Tissue", toast: "🧻 Tissue requested! A waiter is on the way.", Icon: Sparkles },
  { key: "plates", label: "Extra Plates", toast: "🍽️ Extra plates requested! A waiter is on the way.", Icon: PackagePlus },
];

export default function ReminderButtons({ onSend, sending }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map(({ key, label, toast, Icon }) => (
          <motion.button
            key={key}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => onSend(toast)}
            disabled={sending}
            className="flex flex-col items-center justify-center gap-1 py-3 px-1 text-center transition-colors rounded-xl border disabled:opacity-50"
            style={{
              borderColor: "var(--color-border-light)",
              background: "var(--color-cream-100)",
              color: "var(--color-brown-900)",
            }}
          >
            <Icon size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wide leading-tight">{label}</span>
          </motion.button>
        ))}
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => onSend("🔔 Waiter has been called! They'll be with you shortly.")}
        disabled={sending}
        className="w-full py-3.5 text-sm font-black uppercase tracking-widest border-2 flex items-center justify-center gap-2 transition-all rounded-xl"
        style={{
          borderColor: sending ? "var(--color-text-muted)" : "#F59E0B",
          color: sending ? "var(--color-text-muted)" : "#92400E",
          background: sending ? "var(--color-cream-100)" : "#FEF3C7",
        }}
      >
        <BellRing size={18} />
        {sending ? "WAITER CALLED ✓" : "CALL WAITER"}
      </motion.button>
    </div>
  );
}
