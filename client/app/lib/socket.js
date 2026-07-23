/**
 * Socket.IO Client — Nookambika Dhaba
 *
 * Singleton pattern: one socket instance shared across the entire app.
 *
 * Environment variable (set in Vercel dashboard):
 *   NEXT_PUBLIC_SOCKET_URL → https://hotel-management-system-k5zr.onrender.com
 *
 * WHY "websocket" ONLY (not polling first):
 *   - When transports: ["polling", "websocket"] is used, the client sends
 *     an HTTP XHR request FIRST (/socket.io/?transport=polling).
 *   - If CORS is misconfigured even slightly, this XHR fails with
 *     "xhr poll error" — the exact error you see in production.
 *   - Render natively supports WebSockets on all plans.
 *   - Using transports: ["websocket"] skips the fragile polling step entirely,
 *     connecting directly via WS which is far more reliable on Render.
 *
 * Room joining is done by individual pages:
 *   socket.emit("join-table", tableCode)   → customer pages
 *   socket.emit("join-captain")            → captain dashboard
 *   socket.emit("join-admin")              → admin dashboard
 */

import { io } from "socket.io-client";

/**
 * Resolve the backend Socket.IO URL.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SOCKET_URL env var (Vercel production — set in Vercel dashboard)
 *   2. http://localhost:4000 fallback (local development only)
 *
 * IMPORTANT: Never use window.location.hostname — in production that resolves
 * to the Vercel domain, not the Render backend.
 */
const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  return "http://localhost:4000";
};

const SOCKET_URL = getSocketUrl();

/** Singleton socket instance — created once, reused everywhere */
let socket = null;

/**
 * Get (or lazily create) the singleton socket.
 * Does NOT auto-connect — connectSocket() controls when it opens.
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Do not auto-connect — SocketProvider controls the lifecycle
      autoConnect: false,

      // ── CRITICAL FIX ─────────────────────────────────────────────────
      // Use WebSocket ONLY — skip HTTP polling entirely.
      //
      // "xhr poll error" is caused by the polling transport sending an
      // HTTP XHR to /socket.io/ which then fails CORS on Render.
      // By jumping straight to WebSocket we bypass that failure path.
      //
      // Render supports WebSockets natively on all tiers — no polling needed.
      // ─────────────────────────────────────────────────────────────────
      transports: ["websocket"],

      // Upgrade from polling → websocket if server supports it
      upgrade: true,

      // Reconnection settings for cold-start resilience on Render
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,

      // Include credentials so CORS works with credentials: true on server
      withCredentials: true,

      // Connection timeout — Render free tier can be slow on cold start
      timeout: 20000,
    });

    // ── Debug logging ────────────────────────────────────────────────
    socket.on("connect", () => {
      console.log(`[Socket] ✅ Connected to ${SOCKET_URL} — id: ${socket.id}`);
    });

    socket.on("connect_error", (err) => {
      console.error(`[Socket] ❌ Connection error: ${err.message}`);
      console.error(`[Socket] Attempted URL: ${SOCKET_URL}`);
      console.error(`[Socket] Transport: ${socket.io?.engine?.transport?.name}`);
    });

    socket.on("disconnect", (reason) => {
      console.warn(`[Socket] ⚠️ Disconnected — reason: ${reason}`);
    });

    socket.io.on("reconnect", (attempt) => {
      console.log(`[Socket] 🔄 Reconnected after ${attempt} attempt(s)`);
    });

    socket.io.on("reconnect_error", (err) => {
      console.error(`[Socket] Reconnect error: ${err.message}`);
    });
  }
  return socket;
};

/**
 * Connect the socket if not already connected.
 * Safe to call multiple times — idempotent.
 */
export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

/**
 * Disconnect the socket and destroy the singleton.
 * Only call this on full app teardown, NOT on component unmount.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
