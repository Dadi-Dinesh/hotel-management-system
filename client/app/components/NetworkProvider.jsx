"use client";

/**
 * NetworkProvider — the single source of truth for "are we actually able to
 * talk to the backend right now". Combines three signals so the banner
 * reflects reality, not just one flaky heuristic:
 *
 *  1. navigator.onLine        — the OS/browser's own connectivity guess
 *  2. Socket.IO connection    — are we live-connected for realtime events
 *  3. Recent API network errors — a request actually failed to reach the server
 *
 * status is one of "online" | "reconnecting" | "offline":
 *  - "offline": navigator says we have no connection at all.
 *  - "reconnecting": browser thinks we're online, but the socket is down or
 *     an API call just failed to reach the server — a real but hopefully
 *     brief interruption.
 *  - "online": everything nominal.
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketProvider";
import { onNetworkError } from "../lib/pwa/networkEvents";
import { drainQueue, getQueueLength } from "../lib/pwa/offlineQueue";
import { requestBackgroundSync } from "../lib/pwa/backgroundSync";

const NetworkContext = createContext(null);

const RECOVERY_GRACE_MS = 4000; // a single failed request shouldn't flip the banner instantly

export function NetworkProvider({ children }) {
  const { isConnected: socketConnected } = useSocket();
  const [browserOnline, setBrowserOnline] = useState(true);
  const [recentApiFailure, setRecentApiFailure] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const failureTimerRef = useRef(null);

  useEffect(() => {
    setBrowserOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    setQueueLength(getQueueLength());

    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    return onNetworkError(() => {
      setRecentApiFailure(true);
      if (failureTimerRef.current) clearTimeout(failureTimerRef.current);
      failureTimerRef.current = setTimeout(() => setRecentApiFailure(false), RECOVERY_GRACE_MS);
    });
  }, []);

  // Whenever we look "online" again, try to flush the offline queue —
  // this is the manual-retry fallback for browsers without Background Sync.
  useEffect(() => {
    if (!browserOnline) return undefined;
    let cancelled = false;

    const trySync = async () => {
      if (getQueueLength() === 0) return;
      const result = await drainQueue();
      if (!cancelled && result.synced > 0) {
        setLastSyncAt(new Date().toISOString());
      }
      if (!cancelled) setQueueLength(getQueueLength());
    };

    trySync();
    requestBackgroundSync();
    const interval = setInterval(trySync, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [browserOnline, socketConnected]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return undefined;
    const handleMessage = (event) => {
      if (event.data?.type === "SYNC_REQUESTED") {
        drainQueue().then((result) => {
          if (result.synced > 0) setLastSyncAt(new Date().toISOString());
          setQueueLength(getQueueLength());
        });
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  const status = !browserOnline ? "offline" : !socketConnected || recentApiFailure ? "reconnecting" : "online";

  return (
    <NetworkContext.Provider
      value={{
        status,
        isOnline: browserOnline,
        socketConnected,
        queueLength,
        lastSyncAt,
        refreshQueueLength: () => setQueueLength(getQueueLength()),
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetwork must be used within a <NetworkProvider>");
  }
  return ctx;
}
