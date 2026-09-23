"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCcw } from "lucide-react";
import { PLATFORM_NAME } from "../lib/branding";

/**
 * Served by the service worker (public/sw.js) when a navigation request
 * fails and the requested page itself isn't cached — the last-resort app
 * shell so a lost connection never shows the browser's bare "no internet"
 * error page.
 */
export default function OfflinePage() {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => window.location.reload();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const handleRetry = () => {
    setChecking(true);
    setTimeout(() => window.location.reload(), 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-cream-50, #FFFDF7)" }}>
      <div className="text-center max-w-sm">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--color-brown-800, #3D2710)" }}
        >
          <WifiOff size={28} color="white" />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900, #3D2710)" }}>
          You&apos;re Offline
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted, #78716C)" }}>
          {PLATFORM_NAME} couldn&apos;t reach the server. Pages you&apos;ve already visited will still work — reconnect and try again for everything else.
        </p>
        <button
          onClick={handleRetry}
          disabled={checking}
          className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider"
        >
          <RefreshCcw size={16} className={checking ? "animate-spin" : ""} /> {checking ? "Checking..." : "Try Again"}
        </button>
      </div>
    </div>
  );
}
