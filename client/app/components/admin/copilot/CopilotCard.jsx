"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * CopilotCard — the AI Copilot's premium glassmorphism card for a single
 * daily insight (Busy Hour, Best Seller, Kitchen Alert, etc.). Every card
 * is a measured fact computed from real data — `loading`/`hasData` states
 * make that explicit rather than ever showing a fabricated placeholder.
 */
export default function CopilotCard({ icon, title, text, accent = "var(--ss-accent)", hasData = true, loading = false, trend }) {
  const shouldReduceMotion = useReducedMotion();
  const TrendIcon = trend == null ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : null;
  const trendColor = trend > 0 ? "var(--ss-success)" : "var(--ss-danger)";

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.25 }}
      tabIndex={0}
      className="rounded-[var(--ss-radius-card)] p-4 flex flex-col gap-2.5 h-full focus:outline-none focus-visible:ring-2"
      style={{
        border: "1px solid var(--ss-border)",
        background: "var(--ss-surface)",
        boxShadow: "var(--ss-shadow-sm)",
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
        <div className="flex items-center gap-1.5">
          {TrendIcon && (
            <span className="flex items-center gap-0.5 ss-caption font-bold" style={{ color: trendColor }}>
              <TrendIcon size={11} /> {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {hasData && (
            <span className="ss-caption font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(27,138,90,0.12)", color: "var(--ss-success)" }}>
              Measured
            </span>
          )}
        </div>
      </div>

      <p className="ss-caption font-bold" style={{ color: "var(--ss-secondary)" }}>{title}</p>

      {loading ? (
        <div className="h-8 rounded-lg ss-shimmer" />
      ) : (
        <p className="ss-small font-semibold leading-snug" style={{ color: hasData ? "var(--ss-primary)" : "var(--ss-secondary)" }}>
          {text}
        </p>
      )}
    </motion.div>
  );
}
