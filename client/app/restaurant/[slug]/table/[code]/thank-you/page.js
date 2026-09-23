"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PLATFORM_NAME } from "../../../../../lib/branding";

export default function TenantThankYouPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();
  const slug = params.slug;
  const [countdown, setCountdown] = useState(9);
  const [animate, setAnimate] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");

  useEffect(() => {
    if (tableCode && slug) {
      localStorage.removeItem(`session-${slug}-${tableCode}`);
    }
    try {
      const cached = localStorage.getItem("restaurant");
      if (cached) setRestaurantName(JSON.parse(cached)?.name || "");
    } catch (e) {
      // ignore
    }

    const animTimer = setTimeout(() => setAnimate(true), 50);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    const redirectTimer = setTimeout(() => router.push(`/restaurant/${slug}`), 9000);

    return () => {
      clearTimeout(animTimer);
      clearInterval(interval);
      clearTimeout(redirectTimer);
    };
  }, [tableCode, slug, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--color-surface)" }}>
      <div
        className="flex items-center justify-center mb-8"
        style={{
          width: "6rem",
          height: "6rem",
          border: "3px solid var(--color-brown-900)",
          background: "var(--color-cream-200)",
          transition: "transform 0.5s ease, opacity 0.5s ease",
          transform: animate ? "scale(1)" : "scale(0.5)",
          opacity: animate ? 1 : 0,
        }}
      >
        <svg viewBox="0 0 52 52" width="44" height="44" style={{ overflow: "visible" }}>
          <polyline
            points="14,28 23,37 38,18"
            fill="none"
            stroke="var(--color-orange-500)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeDasharray: 50, strokeDashoffset: animate ? 0 : 50, transition: "stroke-dashoffset 0.6s ease 0.3s" }}
          />
        </svg>
      </div>

      <div
        className="text-center max-w-sm w-full"
        style={{ transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s", opacity: animate ? 1 : 0, transform: animate ? "translateY(0)" : "translateY(16px)" }}
      >
        <p className="text-5xl mb-4">🙏</p>
        <h1 className="text-4xl font-black uppercase tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
          Thank You!
        </h1>
        <p className="text-lg font-bold mb-6" style={{ color: "var(--color-orange-500)" }}>We hope you enjoyed dining with us ❤️</p>

        {restaurantName && (
          <div className="flex items-center justify-center gap-2 mb-6" style={{ color: "var(--color-brown-900)" }}>
            <span className="font-black text-sm uppercase tracking-widest" style={{ fontFamily: "var(--font-heading)" }}>{restaurantName}</span>
          </div>
        )}

        <div className="space-y-2 mb-10">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>&quot;We look forward to serving you again.&quot;</p>
          <p className="text-sm font-bold mt-3" style={{ color: "var(--color-brown-900)" }}>Visit Again 😊</p>
        </div>

        <div className="border p-4" style={{ borderColor: "var(--color-cream-300)", background: "var(--color-cream-100)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Returning to home in</p>
          <p className="text-3xl font-black mt-1" style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-500)" }}>{countdown}s</p>
        </div>

        <p className="mt-6 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Powered by {PLATFORM_NAME}</p>
      </div>
    </div>
  );
}
