"use client";

const statusConfig = {
  PENDING: { label: "Pending", class: "badge-pending" },
  ACCEPTED: { label: "Accepted", class: "badge-accepted" },
  PREPARING: { label: "Preparing", class: "badge-preparing" },
  SERVED: { label: "Served", class: "badge-served" },
  CANCELLED: { label: "Cancelled", class: "badge-cancelled" },
};

export default function OrderStatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.PENDING;

  return <span className={`badge ${config.class}`}>{config.label}</span>;
}
