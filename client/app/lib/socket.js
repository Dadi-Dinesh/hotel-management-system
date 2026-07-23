/**
 * Socket.IO Client — Nookambika Dhaba
 *
 * Singleton pattern: one socket instance shared across the entire app.
 *
 * Environment variables (set in Vercel dashboard):
 *   NEXT_PUBLIC_SOCKET_URL  → https://hotel-management-system-k5zr.onrender.com
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
 *   1. NEXT_PUBLIC_SOCKET_URL env var (Vercel production)
 *   2. localhost:4000 fallback (local development)
 */
const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  // Local dev fallback — do NOT use window.location.hostname in prod
  return "http://localhost:4000";
};

const SOCKET_URL = getSocketUrl();

/** Singleton socket instance — created once, reused everywhere */
let socket = null;

/**
 * Get (or lazily create) the singleton socket.
 * Does NOT auto-connect — call connectSocket() to open the connection.
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Do not connect immediately — let SocketProvider control lifecycle
      autoConnect: false,

      // IMPORTANT: Start with polling, then upgrade to WebSocket.
      // Render's free tier reverse proxy may block raw WS upgrades initially.
      // Polling as first transport ensures the handshake always succeeds.
      transports: ["polling", "websocket"],

      // Reconnection settings
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,

      // Credentials for CORS
      withCredentials: true,

      // Timeout for initial connection attempt
      timeout: 20000,
    });

    // Log all events in development for debugging
    if (process.env.NODE_ENV === "development") {
      socket.onAny((event, ...args) => {
        console.log(`[Socket] Event: ${event}`, args);
      });
    }
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
