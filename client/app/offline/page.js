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
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--ss-bg, #F7F4ED)" }}>
      <div className="text-center max-w-sm">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--ss-primary, #3B220A)" }}
        >
          <WifiOff size={30} color="#fff" />
        </div>
        <h1 className="ss-h2 mb-2">You&apos;re Offline</h1>
        <p className="ss-small mb-8 max-w-xs mx-auto">
          {PLATFORM_NAME} couldn&apos;t reach the server. Pages you&apos;ve already visited will still work — reconnect and try again for everything else.
        </p>
        <button
          onClick={handleRetry}
          disabled={checking}
          className="ss-btn inline-flex items-center gap-2 px-6 py-3.5 ss-small font-semibold disabled:opacity-60"
          data-variant="primary"
          style={{
            background: "var(--ss-accent, #E89017)",
            color: "var(--ss-on-accent, #fff)",
            borderRadius: "var(--ss-radius-button, 16px)",
            boxShadow: "var(--ss-shadow-md, 0 16px 40px -16px rgba(59,34,10,0.16))",
          }}
        >
          <RefreshCcw size={16} className={checking ? "animate-spin" : ""} /> {checking ? "Checking..." : "Try Again"}
        </button>
      </div>
    </div>
  );
}
