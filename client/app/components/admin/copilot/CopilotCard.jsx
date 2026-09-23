"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * CopilotCard — the AI Copilot's premium glassmorphism card for a single
 * daily insight (Busy Hour, Best Seller, Kitchen Alert, etc.). Every card
 * is a measured fact computed from real data — `loading`/`hasData` states
 * make that explicit rather than ever showing a fabricated placeholder.
 */
export default function CopilotCard({ icon, title, text, accent = "var(--color-orange-500)", hasData = true, loading = false }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.25 }}
      tabIndex={0}
      className="rounded-2xl p-4 border flex flex-col gap-2.5 focus:outline-none focus-visible:ring-2"
      style={{
        borderColor: "var(--color-border-light)",
        background: "linear-gradient(145deg, rgba(255,253,247,0.85), rgba(255,251,235,0.55))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 10px 28px -16px rgba(61, 39, 16, 0.35)",
        outlineColor: accent,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}1A`, color: accent }}
        >
          {icon}
        </span>
        {hasData && (
          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "#ECFDF5", color: "#065F46" }}>
            Measured
          </span>
        )}
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>{title}</p>

      {loading ? (
        <div className="h-8 rounded-lg animate-pulse" style={{ background: "var(--color-cream-200)" }} />
      ) : (
        <p className="text-sm font-semibold leading-snug" style={{ color: hasData ? "var(--color-brown-900)" : "var(--color-text-muted)" }}>
          {text}
        </p>
      )}
    </motion.div>
  );
}
