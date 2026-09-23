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
  accent = "var(--color-orange-500)",
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
  const trendColor = trend == null ? "var(--color-text-muted)" : trend > 0 ? "var(--color-success)" : trend < 0 ? "var(--color-danger)" : "var(--color-text-muted)";

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl p-4 sm:p-5 border flex flex-col gap-3"
      style={{
        borderColor: "var(--color-border-light)",
        background: "rgba(255, 253, 247, 0.75)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 8px 24px -14px rgba(61, 39, 16, 0.3)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}1A`, color: accent }}
        >
          {icon}
        </span>
        {trend != null && TrendIcon && (
          <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: trendColor }}>
            <TrendIcon size={12} />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p
          className="text-xl sm:text-2xl font-black tabular-nums"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
        >
          {prefix}
          {formatted}
          {suffix}
        </p>
        <p className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}
