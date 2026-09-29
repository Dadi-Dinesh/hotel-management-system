"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: number | null; // percent change vs previous period, e.g. 12.5 or -4.2
  accent?: string;
}

export default function StatCard({
  icon,
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  trend,
  accent = "var(--ss-accent)",
}: StatCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => (shouldReduceMotion ? value : 0));
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const start = performance.now();
    const from = 0;
    const duration = 900;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString("en-IN");

  const TrendIcon = trend == null ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend == null ? "var(--ss-secondary)" : trend > 0 ? "var(--ss-success)" : trend < 0 ? "var(--ss-danger)" : "var(--ss-secondary)";

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.2 }}
      className="rounded-[var(--ss-radius-card)] p-4 flex flex-col gap-2.5 h-full"
      style={{
        border: "1px solid var(--ss-border)",
        background: "var(--ss-surface)",
        boxShadow: "var(--ss-shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}1A`, color: accent }}
        >
          {icon}
        </span>
        {trend != null && TrendIcon && (
          <span className="flex items-center gap-1 ss-caption font-bold" style={{ color: trendColor }}>
            <TrendIcon size={12} />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p
          className="text-xl font-bold tabular-nums"
          style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}
        >
          {prefix}
          {formatted}
          {suffix}
        </p>
        <p className="ss-caption font-semibold mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}
