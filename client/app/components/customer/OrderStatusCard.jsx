"use client";

import { useEffect, useState } from "react";
import OrderTimeline from "../OrderTimeline";

const STATUS_META = {
  PENDING: { label: "Placed", bg: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" },
  ACCEPTED: { label: "Accepted", bg: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" },
  PREPARING: { label: "Preparing", bg: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" },
  SERVED: { label: "Served", bg: "rgba(27, 138, 90, 0.12)", color: "var(--ss-success)" },
  CANCELLED: { label: "Cancelled", bg: "rgba(214, 69, 69, 0.12)", color: "var(--ss-danger)" },
};

function formatElapsed(createdAt, now) {
  const mins = Math.max(0, Math.round((now - new Date(createdAt).getTime()) / 60000));
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

/** Live-feeling order card: number, table, elapsed time, status badge, timeline, items. */
export default function OrderStatusCard({ order, tableCode, children }) {
  const [now, setNow] = useState(() => Date.now());

  // Purely cosmetic ticker so "elapsed time" stays fresh without needing a
  // new network call — real status changes still arrive via Socket.IO.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const meta = STATUS_META[order.status] || STATUS_META.PENDING;

  return (
    <div
      className="rounded-[var(--ss-radius-card)] p-4 sm:p-5"
      style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", boxShadow: "var(--ss-shadow-sm)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <p className="text-sm font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
            Order #{order.orderNumber}
          </p>
          <p className="ss-caption" style={{ color: "var(--ss-secondary)" }}>
            {tableCode ? `Table ${tableCode} · ` : ""}
            {formatElapsed(order.createdAt, now)}
          </p>
        </div>
        <span
          className="ss-caption font-bold uppercase px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      {order.status !== "CANCELLED" && (
        <div className="mt-4 mb-4">
          <OrderTimeline status={order.status} />
        </div>
      )}

      {children}
    </div>
  );
}
