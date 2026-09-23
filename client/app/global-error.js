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
          background: "#FFFDF7",
          color: "#3D2710",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <p style={{ fontWeight: 800, fontSize: 16, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
            ServeSync hit a problem
          </p>
          <p style={{ fontSize: 13, color: "#8A7B6C", lineHeight: 1.6, marginBottom: 24 }}>
            Something went wrong loading the app. Reloading usually fixes this.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "12px 20px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              background: "#E8891C",
              color: "#fff",
              border: "none",
              borderRadius: 2,
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
