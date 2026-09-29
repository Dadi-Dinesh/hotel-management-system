"use client";

/** Design-system text input — 14px radius, accent focus ring, optional leading icon. */
export default function Input({ label, id, error, icon: Icon, className = "", ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="ss-small font-semibold block mb-2" style={{ color: "var(--ss-primary)" }}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: "var(--ss-secondary)" }}
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          className={`ss-input ss-body w-full h-12 ${Icon ? "pl-11" : "pl-4"} pr-4 ${className}`}
          style={{
            background: "var(--ss-surface)",
            border: `1px solid ${error ? "var(--ss-danger)" : "var(--ss-border)"}`,
            borderRadius: "var(--ss-radius-input)",
            color: "var(--ss-primary)",
          }}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id={id ? `${id}-error` : undefined} role="alert" className="ss-caption mt-1.5" style={{ color: "var(--ss-danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
