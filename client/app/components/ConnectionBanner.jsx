"use client";

/**
 * ConnectionBanner — a slim, non-blocking strip at the very top of the
 * viewport reflecting NetworkProvider's status. Deliberately never a modal
 * or alert() — it never interrupts what the user is doing. Only visible
 * while something is actually wrong, plus a brief "back online" confirmation
 * so the recovery isn't silent.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { WifiOff, RefreshCw, Wifi } from "lucide-react";
import { useNetwork } from "./NetworkProvider";

const COPY = {
  offline: { icon: WifiOff, text: "Offline Mode — changes will sync automatically once you're back", bg: "#7F1D1D", color: "white" },
  reconnecting: { icon: RefreshCw, text: "Reconnecting...", bg: "#B45309", color: "white", spin: true },
  online: { icon: Wifi, text: "Back online", bg: "#065F46", color: "white" },
};

export default function ConnectionBanner() {
  const { status, queueLength } = useNetwork();
  const shouldReduceMotion = useReducedMotion();
  const [showRecovered, setShowRecovered] = useState(false);
  const [wasEverBad, setWasEverBad] = useState(false);

  useEffect(() => {
    if (status !== "online") {
      setWasEverBad(true);
      setShowRecovered(false);
      return undefined;
    }
    if (wasEverBad) {
      setShowRecovered(true);
      const t = setTimeout(() => {
        setShowRecovered(false);
        setWasEverBad(false);
      }, 3000);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const visible = status !== "online" || showRecovered;
  const config = COPY[status !== "online" ? status : "online"];
  const Icon = config.icon;
  const label = status === "offline" && queueLength > 0 ? `Offline Mode — ${queueLength} action${queueLength === 1 ? "" : "s"} queued to sync` : config.text;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={shouldReduceMotion ? false : { y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { y: -32, opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 py-1.5 px-4 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: config.bg, color: config.color }}
        >
          <Icon size={12} className={config.spin ? "animate-spin" : ""} />
          <span>{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
