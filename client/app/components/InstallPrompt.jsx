"use client";

/**
 * InstallPrompt — a small, dismissible "Install ServeSync" card.
 *
 * Android/Desktop Chrome/Edge fire `beforeinstallprompt`, which we capture
 * and defer so we can trigger it from our own UI instead of the browser's
 * default mini-infobar. iOS Safari never fires that event (no programmatic
 * install API exists there) — for iOS we instead show a short "Add to Home
 * Screen" instruction, since that's the only real path on that platform.
 *
 * Dismissal is remembered for 14 days so this never nags.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Download, X, Share } from "lucide-react";
import { PLATFORM_NAME } from "../lib/branding";

const DISMISS_KEY = "servesync-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function isDismissedRecently() {
  if (typeof window === "undefined") return true;
  try {
    const at = localStorage.getItem(DISMISS_KEY);
    if (!at) return false;
    return Date.now() - Number(at) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isIOS() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

export default function InstallPrompt() {
  const shouldReduceMotion = useReducedMotion();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return undefined;

    if (isIOS()) {
      // No install event on iOS — just show the manual instruction, once.
      const t = setTimeout(() => setIosHint(true), 3000);
      return () => clearTimeout(t);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setIosHint(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Non-fatal — worst case it asks again next session.
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const showing = visible || iosHint;

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 rounded-2xl border-2 p-4 shadow-xl"
          style={{ background: "var(--color-cream-50, #FFFDF7)", borderColor: "var(--color-brown-900, #3D2710)" }}
          role="dialog"
          aria-label="Install app prompt"
        >
          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ color: "var(--color-text-muted, #78716C)" }}
          >
            <X size={14} />
          </button>

          <div className="flex items-start gap-3 pr-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-brown-800, #3D2710)" }}
            >
              {iosHint ? <Share size={18} color="white" /> : <Download size={18} color="white" />}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--color-brown-900, #3D2710)" }}>
                Install {PLATFORM_NAME}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted, #78716C)" }}>
                {iosHint
                  ? 'Tap the Share icon, then "Add to Home Screen" for one-tap access.'
                  : "Add it to your home screen for a faster, app-like experience."}
              </p>
            </div>
          </div>

          {!iosHint && (
            <button
              onClick={handleInstall}
              className="btn-primary w-full mt-3 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              Install
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
