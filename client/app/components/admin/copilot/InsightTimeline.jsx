"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Clock, TrendingUp, Sparkles, IndianRupee } from "lucide-react";

const ICONS = {
  BUSY_HOUR: Clock,
  NEW_ITEM: Sparkles,
  REVENUE_MILESTONE: IndianRupee,
};

/** Today's notable moments, replayed from real order timestamps — nothing stored, nothing invented. */
export default function InsightTimeline({ timeline, loading }) {
  const shouldReduceMotion = useReducedMotion();

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
      </div>
    );
  }

  if (!timeline?.hasData || timeline.events.length === 0) {
    return <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>Not enough data yet.</p>;
  }

  return (
    <div className="space-y-0.5">
      {timeline.events.map((event, i) => {
        const Icon = ICONS[event.type] || TrendingUp;
        return (
          <motion.div
            key={`${event.type}-${event.time}-${i}`}
            initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: shouldReduceMotion ? 0 : Math.min(i * 0.03, 0.3) }}
            className="flex items-center gap-3 py-2 px-1 border-b last:border-b-0"
            style={{ borderColor: "var(--color-border-light)" }}
          >
            <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-cream-100)", color: "var(--color-orange-500)" }}>
              <Icon size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--color-brown-900)" }}>{event.text}</p>
            </div>
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
              {new Date(event.time).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
