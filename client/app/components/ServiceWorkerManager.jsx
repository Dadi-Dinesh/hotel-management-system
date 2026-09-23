"use client";

/**
 * ServiceWorkerManager — registers public/sw.js once on mount and exposes
 * its live state (supported / registered / update available) via context,
 * so the PWA Settings page and the hidden Offline Test page can both read
 * and act on it without re-implementing registration logic.
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ServiceWorkerContext = createContext(null);

export function ServiceWorkerManager({ children }) {
  const [supported, setSupported] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [status, setStatus] = useState("unregistered"); // unregistered | registering | active | error

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setSupported(false);
      return undefined;
    }
    setSupported(true);
    setStatus("registering");

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return;
        setRegistration(reg);
        setStatus(reg.active ? "active" : "registering");

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
            if (installing.state === "activated") {
              setStatus("active");
            }
          });
        });
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  /** Applies a waiting update immediately (used by "Force Refresh" in Settings). */
  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }, [registration]);

  const forceRefresh = useCallback(async () => {
    if (registration) {
      await registration.update();
    }
    if (registration?.waiting) {
      applyUpdate();
    } else {
      window.location.reload();
    }
  }, [registration, applyUpdate]);

  return (
    <ServiceWorkerContext.Provider value={{ supported, registration, status, updateAvailable, applyUpdate, forceRefresh }}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}

export function useServiceWorker() {
  const ctx = useContext(ServiceWorkerContext);
  if (!ctx) {
    throw new Error("useServiceWorker must be used within a <ServiceWorkerManager>");
  }
  return ctx;
}
