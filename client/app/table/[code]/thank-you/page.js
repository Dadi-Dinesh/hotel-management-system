"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { MessageCircleHeart } from "lucide-react";
import { PLATFORM_NAME, DEMO_RESTAURANT } from "../../../lib/branding";

export default function ThankYouPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();
  const [countdown, setCountdown] = useState(9);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Clear the session from localStorage — table is now free
    if (tableCode) {
      localStorage.removeItem(`session-${tableCode}`);
      localStorage.removeItem(`seat-${tableCode}`);
    }

    // Countdown tick every second
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Redirect to home after 9 seconds
    const redirectTimer = setTimeout(() => {
      router.push("/");
    }, 9000);

    return () => {
      clearInterval(interval);
      clearTimeout(redirectTimer);
    };
  }, [tableCode, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10" style={{ background: "var(--ss-bg)" }}>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center max-w-sm w-full"
      >
        {/* Warm illustration — checkmark medallion */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--ss-accent-tint)" }}
        >
          <svg viewBox="0 0 52 52" width="44" height="44" style={{ overflow: "visible" }} aria-hidden="true">
            <circle cx="26" cy="26" r="24" fill="none" stroke="var(--ss-accent)" strokeWidth="2" opacity="0.35" />
            <motion.polyline
              points="14,28 23,37 38,18"
              fill="none"
              stroke="var(--ss-accent-dark)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            />
          </svg>
        </div>

        <h1 className="ss-h1 mb-2">Thank You!</h1>
        <p className="ss-body font-semibold mb-6" style={{ color: "var(--ss-accent-dark)" }}>
          We hope you enjoyed dining with us ❤️
        </p>

        {/* Restaurant identity */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-full overflow-hidden border flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
            <Image src={DEMO_RESTAURANT.logo} alt="Logo" width={28} height={28} className="w-full h-full object-cover" />
          </div>
          <span className="ss-small font-bold" style={{ color: "var(--ss-primary)" }}>{DEMO_RESTAURANT.name}</span>
        </div>

        <p className="ss-body mb-1">Your session is complete.</p>
        <p className="ss-h3 mb-8" style={{ color: "var(--ss-primary)" }}>Visit Again 😊</p>

        {/* Optional feedback shortcut — links to the real contact page rather
            than pretending to submit somewhere; no session/feedback API call
            happens here. */}
        <Link
          href="/contact"
          className="ss-link-hover inline-flex items-center gap-2 px-4 py-2.5 rounded-full ss-small font-semibold mb-8"
          style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-secondary)" }}
        >
          <MessageCircleHeart size={15} style={{ color: "var(--ss-accent-dark)" }} />
          Share more feedback
        </Link>

        {/* Auto-redirect notice */}
        <div className="p-4 rounded-[var(--ss-radius-card)]" style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)" }}>
          <p className="ss-caption font-semibold">Returning to home in</p>
          <p className="text-3xl font-bold mt-1" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-accent-dark)" }}>
            {countdown}s
          </p>
        </div>

        <p className="ss-caption mt-6">Powered by {PLATFORM_NAME}</p>
      </motion.div>
    </div>
  );
}
