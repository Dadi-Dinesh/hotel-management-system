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
      style={{ background: "var(--ss-bg, #F7F4ED)" }}
    >
      <div className="max-w-sm w-full text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(214, 69, 69, 0.12)" }}
        >
          <AlertTriangle size={32} style={{ color: "var(--ss-danger, #D64545)" }} />
        </div>
        <h1 className="ss-h2 mb-2">Something went wrong</h1>
        <p className="ss-small mb-8 max-w-xs mx-auto">
          This page hit an unexpected error. Your session and any unsaved data are safe — try again, or head back home.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => reset()}
            className="ss-btn inline-flex items-center justify-center gap-2 px-6 py-3.5 ss-small font-semibold"
            data-variant="primary"
            style={{
              background: "var(--ss-accent, #E89017)",
              color: "var(--ss-on-accent, #fff)",
              borderRadius: "var(--ss-radius-button, 16px)",
              boxShadow: "var(--ss-shadow-md, 0 16px 40px -16px rgba(59,34,10,0.16))",
            }}
          >
            <RefreshCw size={16} /> Try Again
          </button>
          <Link
            href="/"
            className="ss-btn inline-flex items-center justify-center gap-2 px-6 py-3.5 ss-small font-semibold"
            data-variant="secondary"
            style={{
              background: "var(--ss-surface, #FFFDF8)",
              border: "1px solid var(--ss-border, #E4D3B2)",
              color: "var(--ss-primary, #3B220A)",
              borderRadius: "var(--ss-radius-button, 16px)",
            }}
          >
            <Home size={16} /> Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
