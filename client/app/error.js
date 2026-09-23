"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";
import { PLATFORM_NAME } from "./lib/branding";

/**
 * Route-segment error boundary — Next.js renders this in place of any page
 * that throws during render, keeping navigation/layout chrome outside this
 * segment intact instead of a full white-screen crash. `reset()` re-renders
 * the segment without a full page reload (the "retry" action).
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(`[${PLATFORM_NAME}] Unhandled route error:`, error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: "var(--color-cream-50, #FFFDF7)" }}
    >
      <div className="max-w-sm w-full text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{
            background: "linear-gradient(135deg, var(--color-cream-200), var(--color-cream-100))",
            border: "1px solid var(--color-border-light)",
          }}
        >
          <AlertTriangle size={28} style={{ color: "var(--color-orange-500, #E8891C)" }} />
        </div>
        <p
          className="font-bold text-base uppercase tracking-widest mb-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900, #3D2710)" }}
        >
          Something went wrong
        </p>
        <p
          className="text-xs max-w-xs mx-auto leading-relaxed mb-6"
          style={{ color: "var(--color-text-muted, #8A7B6C)" }}
        >
          This page hit an unexpected error. Your session and any unsaved data are safe — try again, or head back home.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90"
            style={{ background: "var(--color-orange-500, #E8891C)", color: "#fff", borderRadius: "2px" }}
          >
            <RefreshCw size={14} /> Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border transition-opacity hover:opacity-90"
            style={{
              borderColor: "var(--color-border-light)",
              color: "var(--color-brown-900, #3D2710)",
              borderRadius: "2px",
            }}
          >
            <Home size={14} /> Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
