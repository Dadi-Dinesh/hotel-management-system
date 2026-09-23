"use client";

import { useState } from "react";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

interface SeriesPoint {
  label: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

interface RevenueChartProps {
  series: SeriesPoint[];
  period: "today" | "week" | "month" | "year";
  onPeriodChange: (period: "today" | "week" | "month" | "year") => void;
  loading?: boolean;
}

const PERIODS: Array<{ key: RevenueChartProps["period"]; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

const METRICS = [
  { key: "revenue", label: "Revenue" },
  { key: "orders", label: "Orders" },
  { key: "averageOrderValue", label: "Avg Order Value" },
] as const;

function CustomTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs font-bold shadow-lg border"
      style={{ background: "var(--color-brown-900)", color: "#FFFDF7", borderColor: "var(--color-brown-900)" }}
    >
      <p className="opacity-70 mb-0.5">{label}</p>
      <p>
        {metric === "revenue" || metric === "averageOrderValue" ? "₹" : ""}
        {typeof val === "number" ? val.toLocaleString("en-IN") : val}
        {metric === "orders" ? " orders" : ""}
      </p>
    </div>
  );
}

export default function RevenueChart({ series, period, onPeriodChange, loading }: RevenueChartProps) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("revenue");

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 border"
      style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors"
              style={{
                background: metric === m.key ? "var(--color-orange-500)" : "transparent",
                color: metric === m.key ? "white" : "var(--color-brown-900)",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => onPeriodChange(p.key)}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors"
              style={{
                background: period === p.key ? "var(--color-brown-900)" : "transparent",
                color: period === p.key ? "white" : "var(--color-brown-900)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 sm:h-72">
        {loading ? (
          <div className="w-full h-full rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />
        ) : series.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-orange-500)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-orange-500)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border-light)" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip metric={metric} />} />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="var(--color-orange-500)"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                animationDuration={600}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
