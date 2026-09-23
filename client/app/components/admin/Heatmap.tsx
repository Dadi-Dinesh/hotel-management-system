"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Cell {
  day: number;
  dayLabel: string;
  hour: number;
  count: number;
}

interface HeatmapProps {
  days: string[];
  cells: Cell[];
  maxCount: number;
  loading?: boolean;
}

function intensityColor(count: number, max: number) {
  if (max <= 0 || count === 0) return "var(--color-cream-100)";
  const ratio = count / max;
  // Interpolate from a light warm tone to the brand orange/brown at full intensity.
  const alpha = 0.15 + ratio * 0.85;
  return `rgba(232, 137, 28, ${alpha.toFixed(2)})`;
}

export default function Heatmap({ days, cells, maxCount, loading }: HeatmapProps) {
  const [hovered, setHovered] = useState<Cell | null>(null);

  const grid: Record<number, Record<number, number>> = {};
  cells.forEach((c) => {
    if (!grid[c.day]) grid[c.day] = {};
    grid[c.day][c.hour] = c.count;
  });

  if (loading) {
    return <div className="h-64 rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Hour labels */}
        <div className="flex items-center mb-1 pl-14">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[9px] font-bold" style={{ color: "var(--color-text-muted)" }}>
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>

        {days.map((dayLabel, dayIndex) => (
          <div key={dayLabel} className="flex items-center gap-0.5 mb-0.5">
            <div className="w-14 flex-shrink-0 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-brown-900)" }}>
              {dayLabel}
            </div>
            {Array.from({ length: 24 }, (_, hour) => {
              const count = grid[dayIndex]?.[hour] || 0;
              const cell = { day: dayIndex, dayLabel, hour, count };
              return (
                <motion.div
                  key={hour}
                  whileHover={{ scale: 1.15 }}
                  onMouseEnter={() => setHovered(cell)}
                  onMouseLeave={() => setHovered((h) => (h === cell ? null : h))}
                  className="flex-1 aspect-square rounded-[3px] cursor-default"
                  style={{ background: intensityColor(count, maxCount), minWidth: 10 }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] font-bold" style={{ color: "var(--color-text-muted)" }}>
        <span>
          {hovered
            ? `${hovered.dayLabel} · ${String(hovered.hour).padStart(2, "0")}:00 — ${hovered.count} order${hovered.count === 1 ? "" : "s"}`
            : "Hover a cell for details"}
        </span>
        <span className="flex items-center gap-1.5">
          Less
          {[0.15, 0.4, 0.65, 1].map((a) => (
            <span key={a} className="w-3 h-3 rounded-sm" style={{ background: `rgba(232, 137, 28, ${a})` }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
