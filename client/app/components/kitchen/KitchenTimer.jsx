"use client";

import { useEffect, useState } from "react";
import { formatElapsed, getElapsedColor } from "../../lib/kitchenUtils";

/**
 * Self-contained ticking clock. Only this small badge re-renders every
 * second — the parent ticket and the rest of the board never do.
 */
export default function KitchenTimer({ since, className = "" }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sinceMs = typeof since === "string" ? new Date(since).getTime() : since;
  const elapsedMs = Math.max(0, now - sinceMs);
  const color = getElapsedColor(elapsedMs);

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-black tabular-nums rounded-md px-2 py-0.5 border ${className}`}
      style={{ background: color.bg, color: color.text, borderColor: color.border }}
    >
      {formatElapsed(elapsedMs)}
    </span>
  );
}
