"use client";

/** Single rounded category/filter pill — active state uses the accent fill. */
export default function CategoryPill({ active = false, onClick, icon: Icon, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`ss-link-hover flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full ss-small font-bold whitespace-nowrap ${className}`}
      style={{
        background: active ? "var(--ss-accent)" : "var(--ss-surface)",
        color: active ? "var(--ss-on-accent)" : "var(--ss-secondary)",
        border: `1px solid ${active ? "var(--ss-accent)" : "var(--ss-border)"}`,
      }}
    >
      {Icon && <Icon size={12} />}
      {children}
    </button>
  );
}
