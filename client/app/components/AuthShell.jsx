"use client";

import { PLATFORM_NAME } from "../lib/branding";

/**
 * Shared shell for the staff login screens (admin/kitchen/captain).
 * Desktop: split layout — branding panel left, form panel right.
 * Mobile: single centered card. Each page supplies its own form/handlers
 * as children; this component owns only layout/presentation.
 */
export default function AuthShell({ icon: Icon, title, subtitle, tagline, children, footer }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2" style={{ background: "var(--ss-bg)" }}>
      {/* Branding panel — desktop only */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "var(--ss-primary)" }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, var(--ss-accent) 0%, transparent 70%)", filter: "blur(80px)" }}
          />
        </div>
        <span className="relative font-bold text-lg" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-accent)" }}>
          {PLATFORM_NAME}
        </span>
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)" }}>
            <Icon size={30} />
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-on-accent)" }}>
            {title}
          </h1>
          <p className="text-base" style={{ color: "rgba(255,253,248,0.7)" }}>{tagline || subtitle}</p>
        </div>
        <p className="relative ss-caption" style={{ color: "rgba(255,253,248,0.4)" }}>
          Staff access only. Contact your administrator for credentials.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", boxShadow: "var(--ss-shadow-md)" }}
            >
              <Icon size={28} />
            </div>
            <h1 className="ss-h2 mb-1">{title}</h1>
            <p className="ss-small">{subtitle}</p>
          </div>
          <div className="hidden lg:block mb-6">
            <h2 className="ss-h3">Sign in</h2>
            <p className="ss-small">{subtitle}</p>
          </div>

          {children}

          {footer && <div className="mt-6 text-center">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
