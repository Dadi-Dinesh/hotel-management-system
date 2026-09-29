"use client";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", bg: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" },
  ACCEPTED: { label: "Accepted", bg: "rgba(59,34,10,0.08)", color: "var(--ss-primary)" },
  PREPARING: { label: "Preparing", bg: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" },
  SERVED: { label: "Served", bg: "rgba(27,138,90,0.12)", color: "var(--ss-success)" },
  CANCELLED: { label: "Cancelled", bg: "rgba(214,69,69,0.12)", color: "var(--ss-danger)" },
};

export default function OrderStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  return (
    <span
      className="inline-flex items-center ss-caption font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
