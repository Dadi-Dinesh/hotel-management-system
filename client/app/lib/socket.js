/**
 * Socket.IO Client — Nookambika Dhaba
 *
 * Single shared Socket.IO client instance for real-time communication.
 *
 * Production Backend URL: https://hotel-management-system-k5zr.onrender.com
 * Environment Variable: NEXT_PUBLIC_SOCKET_URL
 */

import { io } from "socket.io-client";

/**
 * Get production backend Socket.IO URL.
 * Prefers NEXT_PUBLIC_SOCKET_URL env var, defaults to production Render URL,
 * and uses http://localhost:4000 only when running locally on localhost.
 */
const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:4000";
  }
  return "https://hotel-management-system-k5zr.onrender.com";
};

const SOCKET_URL = getSocketUrl();

let socket = null;

export const getSocket = () => {
  if (!socket) {
    console.log(`[Socket] Initializing client connecting to: ${SOCKET_URL}`);

    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 20000,
      withCredentials: true,
      autoConnect: false,
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      console.log(`[Socket] ✅ Connected to ${SOCKET_URL} — id: ${socket.id}`);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect_error message:", err.message);
      console.error(`[Socket] ❌ Connection error to ${SOCKET_URL}:`, err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, "reason:", reason);
    });

    socket.io.on("reconnect", (attempt) => {
      console.log(`[Socket] 🔄 Reconnected after ${attempt} attempt(s)`);
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
