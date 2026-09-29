"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary — only triggers when the ROOT layout itself
 * throws (so it must render its own <html>/<body>, unlike app/error.js).
 * Deliberately dependency-free (no icon library, no framer-motion, no CSS
 * variables) since the layout that would normally provide those has failed.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[ServeSync] Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#F7F4ED",
          color: "#3B220A",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
            ServeSync hit a problem
          </p>
          <p style={{ fontSize: 14, color: "#8C6B47", lineHeight: 1.6, marginBottom: 24 }}>
            Something went wrong loading the app. Reloading usually fixes this.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "14px 24px",
              fontSize: 14,
              fontWeight: 600,
              background: "#E89017",
              color: "#fff",
              border: "none",
              borderRadius: 16,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
