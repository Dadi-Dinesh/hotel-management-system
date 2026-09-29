"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Download, CheckCircle2, Smartphone, Sparkles, QrCode, Zap, Info } from "lucide-react";
import { PLATFORM_NAME } from "../../lib/branding";

export default function InstallSection() {
  const shouldReduceMotion = useReducedMotion();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone
    const standaloneCheck =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true);
    setIsStandalone(Boolean(standaloneCheck));

    // Detect iOS
    const iosCheck =
      typeof window !== "undefined" &&
      /iphone|ipad|ipod/i.test(window.navigator?.userAgent || "") &&
      !window.MSStream;
    setIsIOS(Boolean(iosCheck));

    // Check existing stored prompt on window
    if (typeof window !== "undefined" && window.__servesync_deferred_prompt) {
      setDeferredPrompt(window.__servesync_deferred_prompt);
    }

    // Listen for custom event or native beforeinstallprompt
    const handlePromptReady = () => {
      if (typeof window !== "undefined" && window.__servesync_deferred_prompt) {
        setDeferredPrompt(window.__servesync_deferred_prompt);
      }
    };

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      if (typeof window !== "undefined") {
        window.__servesync_deferred_prompt = e;
      }
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      if (typeof window !== "undefined") {
        window.__servesync_deferred_prompt = null;
      }
    };

    window.addEventListener("servesync:installprompt-ready", handlePromptReady);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("servesync:installprompt-ready", handlePromptReady);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setInstalled(true);
          setDeferredPrompt(null);
          if (typeof window !== "undefined") {
            window.__servesync_deferred_prompt = null;
          }
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    }
  };

  const isAlreadyInstalled = isStandalone || installed;
  const canInstall = Boolean(deferredPrompt) && !isAlreadyInstalled;

  // Already running as an installed PWA — nothing to promote, so the whole
  // section disappears instead of nagging with a leftover "installed" card.
  if (isAlreadyInstalled) return null;

  return (
    <section className="relative px-4 sm:px-6 py-12 sm:py-16">
      <div className="max-w-5xl mx-auto">
        {/* Large Rounded Card with Soft Shadow and Amber Accent */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-[var(--ss-radius-modal)] p-6 sm:p-10 md:p-14 overflow-hidden border transition-all"
          style={{
            borderColor: "var(--ss-border)",
            background: "linear-gradient(135deg, var(--ss-surface) 0%, var(--ss-bg) 100%)",
            boxShadow: "var(--ss-shadow-lg)",
          }}
        >
          {/* Subtle amber ambient glow in corner */}
          <div
            className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-40"
            style={{
              background: "radial-gradient(circle, #F59E0B 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ss-caption font-bold uppercase border"
                style={{
                  background: "var(--ss-accent-tint)",
                  borderColor: "var(--ss-border)",
                  color: "var(--ss-accent-dark)",
                }}
              >
                <Sparkles size={14} style={{ color: "var(--ss-accent)" }} />
                Progressive Web App
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="ss-h2 mb-3">
                  Install {PLATFORM_NAME}
                </h2>
                <p className="ss-body font-medium" style={{ color: "var(--ss-primary)" }}>
                  Add {PLATFORM_NAME} to your home screen for faster access.
                </p>
                <p className="ss-small mt-1.5">
                  Instant launch, zero app store downloads, offline resiliency, and responsive speed on any tablet or smartphone.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 ss-small font-bold" style={{ color: "var(--ss-primary)" }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}>
                    <Zap size={12} />
                  </div>
                  <span>Instant 1-Tap Launch</span>
                </div>
                <div className="flex items-center gap-2 ss-small font-bold" style={{ color: "var(--ss-primary)" }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}>
                    <QrCode size={12} />
                  </div>
                  <span>Offline Ready POS</span>
                </div>
              </div>

              {/* Install Action Area */}
              <div className="pt-3">
                {canInstall ? (
                  <button
                    onClick={handleInstallClick}
                    className="ss-btn inline-flex items-center gap-2.5 px-8 py-4 text-sm font-bold transition-transform active:scale-98"
                    style={{
                      background: "var(--ss-accent)",
                      color: "var(--ss-on-accent)",
                      borderRadius: "var(--ss-radius-button)",
                      boxShadow: "var(--ss-shadow-md)",
                    }}
                    data-variant="primary"
                    id="install-servesync-btn"
                  >
                    <Download size={18} strokeWidth={2.5} />
                    Install {PLATFORM_NAME}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div
                      className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl border ss-small font-semibold"
                      style={{
                        background: isAlreadyInstalled ? "rgba(27, 138, 90, 0.1)" : "var(--ss-accent-tint)",
                        borderColor: isAlreadyInstalled ? "rgba(27, 138, 90, 0.3)" : "var(--ss-border)",
                        color: isAlreadyInstalled ? "var(--ss-success)" : "var(--ss-accent-dark)",
                      }}
                    >
                      {isAlreadyInstalled ? (
                        <>
                          <CheckCircle2 size={18} className="flex-shrink-0" />
                          <span>{PLATFORM_NAME} is installed on this device.</span>
                        </>
                      ) : (
                        <>
                          <Info size={18} className="flex-shrink-0" />
                          <span>Already installed or unsupported on this device.</span>
                        </>
                      )}
                    </div>

                    {isIOS && !isAlreadyInstalled && (
                      <p className="ss-caption flex items-center gap-1.5 pt-1">
                        <Smartphone size={12} />
                        <span>iOS tip: Tap Safari&apos;s Share button and select <strong>&quot;Add to Home Screen&quot;</strong>.</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Device Illustration (Phone Mockup) with Amber Accent */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-64 sm:w-72">
                {/* Decorative Amber Ring / Glow behind the phone */}
                <div
                  className="absolute inset-0 rounded-[44px] -m-3 border-2 border-dashed pointer-events-none"
                  style={{ borderColor: "rgba(232, 144, 23, 0.35)" }}
                  aria-hidden="true"
                />

                {/* Phone Outer Shell */}
                <div
                  className="relative rounded-[40px] p-3.5 bg-stone-900 border-4 border-stone-800 shadow-2xl"
                  style={{
                    boxShadow: "0 25px 60px -15px rgba(61, 39, 16, 0.4), inset 0 0 0 1px rgba(255,255,255,0.1)",
                  }}
                >
                  {/* Phone Speaker / Dynamic Island */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-4 bg-stone-950 rounded-full z-20 flex items-center justify-end pr-2">
                    <div className="w-2 h-2 rounded-full bg-stone-800/80" />
                  </div>

                  {/* Phone Screen */}
                  <div
                    className="relative rounded-[28px] overflow-hidden p-4 pt-8 text-left flex flex-col justify-between"
                    style={{
                      background: "linear-gradient(180deg, #FFFDF7 0%, #FFF8EC 100%)",
                      minHeight: "360px",
                    }}
                  >
                    {/* In-app header */}
                    <div>
                      <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "#E8D8B5" }}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-stone-900 text-amber-400 font-black text-xs flex items-center justify-center">
                            S
                          </span>
                          <span className="font-extrabold text-xs tracking-wider uppercase text-stone-900">
                            {PLATFORM_NAME}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-700">
                          LIVE
                        </span>
                      </div>

                      {/* Mock Table Card */}
                      <div className="bg-white rounded-xl p-3 border shadow-xs space-y-2 mb-3" style={{ borderColor: "#E8D8B5" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-stone-900">Table T04</span>
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                        </div>
                        <p className="text-[10px] text-stone-500">2 Items • In Kitchen</p>
                        <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: "70%" }} />
                        </div>
                      </div>

                      {/* Mock Quick Action */}
                      <div className="bg-white rounded-xl p-3 border shadow-xs space-y-1.5" style={{ borderColor: "#E8D8B5" }}>
                        <div className="flex items-center justify-between text-[11px] font-bold text-stone-800">
                          <span>Quick Actions</span>
                          <Sparkles size={11} className="text-amber-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px] font-medium text-stone-600">
                          <span className="p-1.5 bg-stone-50 rounded border text-center">New Order</span>
                          <span className="p-1.5 bg-stone-50 rounded border text-center">Print Bill</span>
                        </div>
                      </div>
                    </div>

                    {/* In-app bottom home screen badge */}
                    <div
                      className="mt-4 p-2.5 rounded-xl border flex items-center gap-2 text-left"
                      style={{
                        background: "rgba(245, 158, 11, 0.12)",
                        borderColor: "rgba(217, 119, 6, 0.3)",
                      }}
                    >
                      <Download size={14} className="text-amber-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-stone-900 leading-tight">Home Screen Ready</p>
                        <p className="text-[8px] text-stone-500 truncate">Tap to launch anytime</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
