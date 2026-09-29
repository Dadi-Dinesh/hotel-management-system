"use client";

/** Small pill used for trust indicators and inline stats (icon + label). */
export default function StatBadge({ icon: Icon, label, className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${className}`}
      style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)" }}
    >
      {Icon && (
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}
        >
          <Icon size={13} strokeWidth={2.5} aria-hidden="true" />
        </span>
      )}
      <span className="ss-small font-semibold" style={{ color: "var(--ss-primary)" }}>
        {label}
      </span>
    </div>
  );
}
