"use client";

/**
 * SocketProvider — Global Socket.IO context for Next.js
 *
 * Wraps the entire app (in layout.js) to provide a single shared socket
 * to all components via the useSocket() hook.
 *
 * Important: We do NOT call disconnectSocket() on unmount because React
 * StrictMode double-invokes effects. Instead we let the singleton live
 * for the duration of the page session.
 */

import { createContext, useContext, useEffect, useState } from "react";
import { connectSocket, getSocket } from "../lib/socket";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect the singleton socket
    const s = connectSocket();
    setSocket(s);

    // Track connection state
    const onConnect = () => {
      setIsConnected(true);
      console.log(`[Socket] Connected ✅ id=${s.id}`);
    };

    const onDisconnect = (reason) => {
      setIsConnected(false);
      console.warn(`[Socket] Disconnected ⚠️ reason=${reason}`);
    };

    const onConnectError = (err) => {
      setIsConnected(false);
      console.error(`[Socket] Connection error ❌ ${err.message}`);
    };

    const onReconnect = (attempt) => {
      console.log(`[Socket] Reconnected after ${attempt} attempt(s) ✅`);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);
    s.io.on("reconnect", onReconnect);

    // Sync initial state if socket already connected (Strict Mode safe)
    if (s.connected) {
      setIsConnected(true);
    }

    // Cleanup listeners on unmount — but do NOT disconnect the socket.
    // The singleton socket persists across route changes, which is correct.
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
      s.io.off("reconnect", onReconnect);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * useSocket — Access the shared socket and connection state.
 *
 * @returns {{ socket: Socket | null, isConnected: boolean }}
 *
 * Usage:
 *   const { socket, isConnected } = useSocket();
 */
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a <SocketProvider>");
  }
  return context;
}
