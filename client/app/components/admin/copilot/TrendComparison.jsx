"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fetchTrend } from "../../../lib/insights/useAICopilot";

const PERIODS = [
  { key: "today-yesterday", label: "Today vs Yesterday" },
  { key: "week-week", label: "This Week vs Last Week" },
  { key: "month-month", label: "This Month vs Last Month" },
];

const METRICS = [
  { key: "revenue", label: "Revenue", prefix: "₹" },
  { key: "orderCount", label: "Orders", prefix: "" },
  { key: "averageOrderValue", label: "Avg Order Value", prefix: "₹" },
];

/** Historical period-over-period comparison — real numbers only, clearly labeled. */
export default function TrendComparison() {
  const shouldReduceMotion = useReducedMotion();
  const [compare, setCompare] = useState("today-yesterday");
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (period) => {
    setLoading(true);
    try {
      const data = await fetchTrend(period);
      setTrend(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(compare);
  }, [compare, load]);

  return (
    <div className="rounded-2xl p-5 border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: "var(--color-brown-900)" }}>Historical Comparison</h3>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setCompare(p.key)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
              style={{
                background: compare === p.key ? "var(--color-brown-900)" : "white",
                color: compare === p.key ? "white" : "var(--color-text-secondary)",
                borderColor: compare === p.key ? "var(--color-brown-900)" : "var(--color-border-light)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
        </div>
      ) : !trend?.hasData ? (
        <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>Not enough data yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {METRICS.map((m) => {
            const change = trend.changes[m.key];
            const Icon = change == null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;
            const color = change == null || change === 0 ? "var(--color-text-muted)" : change > 0 ? "var(--color-success)" : "var(--color-danger)";
            const currentVal = trend.current[m.key];
            const prevVal = trend.previous[m.key];
            const maxVal = Math.max(currentVal, prevVal, 1);

            return (
              <div key={m.key} className="p-3 rounded-xl border" style={{ borderColor: "var(--color-border-light)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-secondary)" }}>{m.label}</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-lg font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                    {m.prefix}{currentVal.toLocaleString("en-IN")}
                  </span>
                  {change != null && (
                    <span className="flex items-center gap-0.5 text-[11px] font-bold" style={{ color }}>
                      <Icon size={11} /> {Math.abs(change)}%
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <Bar value={currentVal} max={maxVal} color="var(--color-orange-500)" shouldReduceMotion={shouldReduceMotion} />
                  <Bar value={prevVal} max={maxVal} color="var(--color-cream-300, #E7DFCF)" shouldReduceMotion={shouldReduceMotion} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Bar({ value, max, color, shouldReduceMotion }) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-cream-100)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={shouldReduceMotion ? { width: `${pct}%` } : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
}
