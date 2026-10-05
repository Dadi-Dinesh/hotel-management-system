"use client";

/**
 * Small shared building blocks for the ServeSync Admin (/platform) portal —
 * status badges, page headers and the loading / error / empty states every
 * platform page uses, so they all look and behave the same.
 */
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";

const STATUS_STYLES = {
  PENDING: { label: "Pending", color: "#92400E", bg: "#FEF3C7", border: "#FDE68A" },
  APPROVED: { label: "Approved", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
  REJECTED: { label: "Rejected", color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
  ACTIVE: { label: "Active", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
  SUSPENDED: { label: "Suspended", color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
  DEMO: { label: "Demo", color: "#5C3A12", bg: "rgba(232,144,23,0.12)", border: "rgba(232,144,23,0.35)" },
  NEUTRAL: { label: "", color: "#5C3A12", bg: "#F7F4ED", border: "#E4D3B2" },
};

export function StatusBadge({ status, label }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.NEUTRAL;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
      {label || s.label || status}
    </span>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[1.75rem] font-bold leading-tight" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-1" style={{ color: "var(--ss-secondary)" }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = "", bodyClassName = "p-4 sm:p-5" }) {
  return (
    <section
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", boxShadow: "var(--ss-shadow-sm)" }}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b" style={{ borderColor: "var(--ss-border)" }}>
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--ss-primary)" }}>
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Label/value row used throughout the detail pages. Stacks on mobile. */
export function InfoRow({ label, value, mono = false }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-0.5 sm:gap-4 py-2.5 border-b last:border-b-0" style={{ borderColor: "var(--ss-border)" }}>
      <dt className="text-xs sm:text-sm font-medium" style={{ color: "var(--ss-secondary)" }}>
        {label}
      </dt>
      <dd className={`text-sm break-words ${mono ? "font-mono" : "font-semibold"}`} style={{ color: empty ? "var(--ss-secondary)" : "var(--ss-primary)" }}>
        {empty ? "—" : value}
      </dd>
    </div>
  );
}

export function Button({ variant = "secondary", size = "md", className = "", children, ...props }) {
  const variants = {
    primary: { background: "var(--ss-accent)", color: "var(--ss-primary)", border: "1px solid var(--ss-accent)" },
    dark: { background: "var(--ss-primary)", color: "#FFFDF8", border: "1px solid var(--ss-primary)" },
    secondary: { background: "var(--ss-surface)", color: "var(--ss-primary)", border: "1px solid var(--ss-border)" },
    success: { background: "var(--ss-success)", color: "#fff", border: "1px solid var(--ss-success)" },
    danger: { background: "var(--ss-surface)", color: "var(--ss-danger)", border: "1px solid rgba(209,67,67,0.4)" },
    dangerSolid: { background: "var(--ss-danger)", color: "#fff", border: "1px solid var(--ss-danger)" },
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm" };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${className}`}
      style={variants[variant]}
      {...props}
    >
      {children}
    </button>
  );
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: "var(--ss-secondary)" }} role="status">
      <Loader2 size={18} className="animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-4" role="alert">
      <span className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "#FEF2F2", color: "var(--ss-danger)" }}>
        <AlertTriangle size={20} />
      </span>
      <p className="font-semibold text-sm" style={{ color: "var(--ss-primary)" }}>
        Couldn&apos;t load this data
      </p>
      <p className="text-sm mt-1 max-w-sm" style={{ color: "var(--ss-secondary)" }}>
        {message}
      </p>
      {onRetry && (
        <Button className="mt-4" size="sm" onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-4">
      <span className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}>
        <Icon size={20} />
      </span>
      <p className="font-semibold text-sm" style={{ color: "var(--ss-primary)" }}>
        {title}
      </p>
      {description && (
        <p className="text-sm mt-1 max-w-sm" style={{ color: "var(--ss-secondary)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function formatDate(value, withTime = false) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function timeAgo(value) {
  if (!value) return null;
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;
