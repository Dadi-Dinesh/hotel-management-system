"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { QrCode, ChefHat, Users, BarChart3, ShoppingBag, Bell, TrendingUp, Lock } from "lucide-react";

const TABS = [
  { key: "customer", label: "Customer", icon: QrCode },
  { key: "kitchen", label: "Kitchen", icon: ChefHat },
  { key: "waiter", label: "Waiter", icon: Users },
  { key: "admin", label: "Admin", icon: BarChart3 },
];

const AUTO_ROTATE_MS = 3800;

/**
 * HeroMockup — an animated, purely decorative browser-style preview cycling
 * through four real ServeSync surfaces (customer ordering, kitchen, waiter,
 * admin). Every number/name here is illustrative sample data, never a live
 * API call or a screenshot — same "no fake screenshots" rule DashboardMockup
 * already follows.
 */
export default function HeroMockup() {
  const shouldReduceMotion = useReducedMotion();
  const [active, setActive] = useState("customer");

  useEffect(() => {
    if (shouldReduceMotion) return undefined;
    const interval = setInterval(() => {
      setActive((cur) => {
        const idx = TABS.findIndex((t) => t.key === cur);
        return TABS[(idx + 1) % TABS.length].key;
      });
    }, AUTO_ROTATE_MS);
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-lg mx-auto"
    >
      <div
        className={`overflow-hidden ${shouldReduceMotion ? "" : "ss-float"}`}
        style={{
          borderRadius: "var(--ss-radius-modal)",
          border: "1px solid var(--ss-border)",
          background: "var(--ss-surface)",
          boxShadow: "var(--ss-shadow-lg)",
        }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--ss-border)" }}>
          <div className="flex items-center gap-1.5 flex-shrink-0" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#F0A8A0" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#F3C98A" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#A8D9BC" }} />
          </div>
          <div
            className="flex-1 min-w-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "var(--ss-bg)" }}
          >
            <Lock size={10} style={{ color: "var(--ss-secondary)" }} aria-hidden="true" />
            <span className="ss-caption font-medium truncate" style={{ color: "var(--ss-secondary)" }}>
              servesync.app/{active}
            </span>
          </div>
        </div>

        <div className="flex border-b" style={{ borderColor: "var(--ss-border)" }} role="tablist" aria-label="Product preview">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab.key)}
                className="ss-link-hover flex-1 flex flex-col items-center gap-1.5 py-3 focus:outline-none"
                style={{
                  color: isActive ? "var(--ss-accent-dark)" : "var(--ss-secondary)",
                  borderBottom: isActive ? "2px solid var(--ss-accent)" : "2px solid transparent",
                }}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="text-[11px] font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6 min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {active === "customer" && <CustomerMock />}
              {active === "kitchen" && <KitchenMock />}
              {active === "waiter" && <WaiterMock />}
              {active === "admin" && <AdminMock />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function CustomerMock() {
  const items = [
    { name: "Butter Chicken", price: 340, veg: false },
    { name: "Paneer Tikka", price: 260, veg: true },
    { name: "Garlic Naan", price: 60, veg: true },
  ];
  return (
    <div className="space-y-3">
      <p className="ss-caption font-bold" style={{ color: "var(--ss-secondary)" }}>Table T04 · Menu</p>
      {items.map((item) => (
        <div key={item.name} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "var(--ss-bg)" }}>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: item.veg ? "var(--ss-success)" : "var(--ss-danger)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.veg ? "var(--ss-success)" : "var(--ss-danger)" }} />
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--ss-primary)" }}>{item.name}</span>
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--ss-accent-dark)" }}>₹{item.price}</span>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-2xl px-4 py-3.5 mt-2" style={{ background: "var(--ss-accent)" }}>
        <span className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--ss-on-accent)" }}>
          <ShoppingBag size={14} aria-hidden="true" /> 3 items · ₹660
        </span>
        <span className="ss-caption font-bold uppercase" style={{ color: "var(--ss-on-accent)" }}>Place Order</span>
      </div>
    </div>
  );
}

function KitchenMock() {
  const tickets = [
    { table: "T02", items: ["2x Chicken 65", "1x Fried Rice"], mins: 3 },
    { table: "T07", items: ["1x Paneer Butter Masala"], mins: 7 },
  ];
  return (
    <div className="space-y-3">
      <p className="ss-caption font-bold" style={{ color: "var(--ss-secondary)" }}>Live Tickets</p>
      {tickets.map((t) => (
        <div key={t.table} className="rounded-2xl p-4" style={{ background: "var(--ss-primary)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold" style={{ color: "var(--ss-surface)" }}>Table {t.table}</span>
            <span
              className="ss-caption font-bold px-2 py-0.5 rounded-full"
              style={{
                background: t.mins > 5 ? "var(--ss-danger)" : "var(--ss-warning)",
                color: t.mins > 5 ? "var(--ss-surface)" : "var(--ss-primary)",
              }}
            >
              {t.mins} min
            </span>
          </div>
          {t.items.map((it) => (
            <p key={it} className="text-xs font-medium" style={{ color: "rgba(255,253,248,0.75)" }}>{it}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

function WaiterMock() {
  const tables = [
    { code: "T01", status: "Occupied", tone: "var(--ss-danger)" },
    { code: "T02", status: "Bill Req.", tone: "var(--ss-warning)" },
    { code: "T03", status: "Free", tone: "var(--ss-success)" },
    { code: "T04", status: "Occupied", tone: "var(--ss-danger)" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="ss-caption font-bold" style={{ color: "var(--ss-secondary)" }}>Table Overview</p>
        <Bell size={14} style={{ color: "var(--ss-accent)" }} aria-hidden="true" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {tables.map((t) => (
          <div key={t.code} className="rounded-2xl p-3" style={{ background: "var(--ss-bg)" }}>
            <p className="text-sm font-bold" style={{ color: "var(--ss-primary)" }}>{t.code}</p>
            <p className="ss-caption font-bold" style={{ color: t.tone }}>{t.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminMock() {
  const bars = [42, 68, 54, 90, 74];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "var(--ss-primary)" }}>
        <div>
          <p className="ss-caption font-bold mb-1" style={{ color: "rgba(255,253,248,0.6)" }}>Revenue Today</p>
          <p className="text-xl font-bold" style={{ color: "var(--ss-on-accent)" }}>₹18,450</p>
        </div>
        <TrendingUp style={{ color: "var(--ss-success)" }} size={24} aria-hidden="true" />
      </div>
      <div className="flex items-end gap-2 h-16">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: 0.06 * i, duration: 0.4 }}
            className="flex-1 rounded-t-md"
            style={{ background: "var(--ss-accent)" }}
          />
        ))}
      </div>
    </div>
  );
}
