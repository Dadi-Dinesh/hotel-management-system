"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

// Purely decorative preview data — no live API calls, no real restaurant data.
const DEMO_ORDERS = [
  { table: "T04", status: "Preparing", color: "#E8891C" },
  { table: "T09", status: "Served", color: "#2E7D32" },
  { table: "T02", status: "New", color: "#C62828" },
];

const DEMO_BARS = [42, 68, 54, 90, 74, 58, 82];
const DEMO_REVENUE_TARGET = 18450;

export default function DashboardMockup() {
  const [ready, setReady] = useState(false);
  const [revenue, setRevenue] = useState(0);

  // Brief skeleton hold before the mock data "loads" in, purely visual.
  useEffect(() => {
    const revealTimer = setTimeout(() => setReady(true), 650);
    return () => clearTimeout(revealTimer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const duration = 1100;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setRevenue(Math.round(DEMO_REVENUE_TARGET * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md mx-auto rounded-2xl overflow-hidden border"
      style={{
        borderColor: "var(--color-border-light)",
        background: "rgba(255, 253, 247, 0.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 24px 60px -20px rgba(61, 39, 16, 0.35)",
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-1.5 px-4 py-3 border-b"
        style={{ borderColor: "var(--color-border-light)" }}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <span
          className="ml-3 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--color-text-muted)" }}
        >
          ServeSync Admin — Live Preview
        </span>
      </div>

      <div className="p-5">
        {!ready ? (
          <div className="space-y-3">
            {[16, 20, 24].map((h) => (
              <div
                key={h}
                className="animate-pulse"
                style={{ height: `${h * 0.25}rem`, borderRadius: "0.75rem", background: "var(--color-cream-200)" }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Revenue tile */}
            <div
              className="rounded-xl p-4 flex items-center justify-between"
              style={{
                background: "linear-gradient(135deg, var(--color-brown-900) 0%, #5C3D1A 100%)",
              }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">
                  Revenue Today
                </p>
                <p className="text-2xl font-black text-white">
                  ₹{revenue.toLocaleString("en-IN")}
                </p>
              </div>
              <TrendingUp className="text-emerald-400" size={28} />
            </div>

            {/* Bar chart */}
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                Orders This Week
              </p>
              <div className="flex items-end gap-1.5 h-20">
                {DEMO_BARS.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.08 * i, duration: 0.5, ease: "easeOut" }}
                    className="flex-1 rounded-t-sm"
                    style={{ background: "var(--color-orange-500)" }}
                  />
                ))}
              </div>
            </div>

            {/* Live orders */}
            <div className="space-y-2">
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--color-text-muted)" }}
              >
                Live Orders
              </p>
              {DEMO_ORDERS.map((o) => (
                <div
                  key={o.table}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "var(--color-cream-100)" }}
                >
                  <span
                    className="text-xs font-bold"
                    style={{ color: "var(--color-brown-900)" }}
                  >
                    Table {o.table}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ color: o.color, background: `${o.color}1A` }}
                  >
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
