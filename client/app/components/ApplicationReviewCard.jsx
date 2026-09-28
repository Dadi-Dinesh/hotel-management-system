"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Store, MapPin, Sliders, Clock } from "lucide-react";

const STATUS_STYLES = {
  PENDING: { label: "Pending", color: "#B45309", bg: "#FEF3C7" },
  APPROVED: { label: "Approved", color: "#065F46", bg: "#ECFDF5" },
  REJECTED: { label: "Rejected", color: "#991B1B", bg: "#FEF2F2" },
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Reusable card for one restaurant application — used across the Platform Dashboard list. */
export default function ApplicationReviewCard({ application }) {
  const status = STATUS_STYLES[application.status] || STATUS_STYLES.PENDING;

  return (
    <Link href={`/platform/${application.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        className="rounded-2xl border p-5 h-full flex flex-col gap-3 cursor-pointer transition-shadow hover:shadow-md"
        style={{ borderColor: "var(--color-border-light)", background: "#fff" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {application.logo ? (
              <Image
                src={application.logo}
                alt={application.restaurantName}
                width={44}
                height={44}
                className="w-11 h-11 rounded-xl object-cover border flex-shrink-0"
                style={{ borderColor: "var(--color-border-light)" }}
              />
            ) : (
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-cream-100)", color: "var(--color-orange-500)" }}
              >
                <Store size={20} />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: "var(--color-brown-900)" }}>
                {application.restaurantName}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                {application.ownerName}
              </p>
            </div>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full flex-shrink-0"
            style={{ background: status.bg, color: status.color }}
          >
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {application.city}
          </span>
          <span className="flex items-center gap-1">
            <Sliders size={12} /> {application.tableCount} tables
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] mt-auto pt-2 border-t" style={{ borderColor: "var(--color-border-light)", color: "var(--color-text-muted)" }}>
          <Clock size={11} /> Submitted {timeAgo(application.createdAt)}
        </div>
      </motion.div>
    </Link>
  );
}
