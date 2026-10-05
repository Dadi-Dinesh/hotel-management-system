"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Store,
  MapPin,
  Sliders,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  ChefHat,
  Phone,
  Mail,
} from "lucide-react";

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

/** Reusable card for one restaurant application — with direct Accept / Reject actions. */
export default function ApplicationReviewCard({
  application,
  onApprove,
  onReject,
  onViewDetails,
  actionLoading = false,
}) {
  const status = STATUS_STYLES[application.status] || STATUS_STYLES.PENDING;
  const isPending = application.status === "PENDING";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-shadow hover:shadow-md bg-white"
      style={{ borderColor: "var(--color-border-light)" }}
    >
      <div>
        {/* Top Header: Logo + Title + Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
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
              <h3 className="font-bold text-sm truncate text-brown-900" title={application.restaurantName}>
                {application.restaurantName}
              </h3>
              <p className="text-xs truncate text-neutral-500">
                {application.ownerName}
              </p>
            </div>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: status.bg, color: status.color }}
          >
            {status.label}
          </span>
        </div>

        {/* Info Grid */}
        <div className="space-y-1.5 text-xs text-neutral-600 bg-cream-50/60 p-2.5 rounded-xl border border-cream-200/60">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate">
              <MapPin size={12} className="text-neutral-400 flex-shrink-0" />
              <span className="truncate">{application.city || application.address}</span>
            </span>
            <span className="flex items-center gap-1 font-semibold text-brown-900 flex-shrink-0">
              <Sliders size={12} className="text-orange-500" />
              {application.tableCount} tables
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-cream-200/60">
            <span className="flex items-center gap-1.5 truncate">
              <ChefHat size={12} className="text-neutral-400 flex-shrink-0" />
              <span className="truncate">{application.cuisine}</span>
            </span>
            <span className="flex items-center gap-1 text-neutral-400">
              <Phone size={11} /> {application.phone}
            </span>
          </div>
        </div>

        {/* If Rejected: Show reason */}
        {application.status === "REJECTED" && application.rejectionReason && (
          <div className="mt-2.5 p-2 rounded-lg bg-red-50 border border-red-100 text-[11px] text-red-800">
            <span className="font-bold">Reason:</span> {application.rejectionReason}
          </div>
        )}

        {/* Submitted time */}
        <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-2.5">
          <Clock size={11} /> Submitted {timeAgo(application.createdAt)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-neutral-100 flex items-center gap-2">
        {isPending ? (
          <>
            <button
              type="button"
              onClick={() => onApprove(application)}
              disabled={actionLoading}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Accept
            </button>
            <button
              type="button"
              onClick={() => onReject(application)}
              disabled={actionLoading}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <XCircle size={13} />
              Reject
            </button>
            <button
              type="button"
              onClick={() => onViewDetails(application)}
              className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-cream-100 transition-colors"
              title="View full application details"
            >
              <Eye size={15} />
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-neutral-500">
              {application.status === "APPROVED" ? "Provisioned ✓" : "Application Rejected"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onViewDetails(application)}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-brown-900 hover:bg-cream-100 flex items-center gap-1 transition-colors"
              >
                <Eye size={13} /> View Details
              </button>
              <Link
                href={`/platform/${application.id}`}
                className="text-xs font-bold text-orange-600 hover:underline"
              >
                Full Page →
              </Link>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
