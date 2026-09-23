"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { QrCode, ChefHat, Users, BarChart3, ShoppingBag, Bell, TrendingUp } from "lucide-react";

const TABS = [
  { key: "customer", label: "Customer Ordering", icon: QrCode },
  { key: "kitchen", label: "Kitchen Dashboard", icon: ChefHat },
  { key: "waiter", label: "Waiter Dashboard", icon: Users },
  { key: "admin", label: "Admin Analytics", icon: BarChart3 },
];

const AUTO_ROTATE_MS = 3800;

/**
 * HeroMockup — an animated, purely decorative preview cycling through four
 * real ServeSync surfaces (customer ordering, kitchen, waiter, admin).
 * Every number/name here is illustrative sample data, never a live API
 * call or a screenshot — same "no fake screenshots" rule DashboardMockup
 * already follows, extended to cover all four product areas the brief asks
 * the hero to represent.
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
      className="w-full max-w-md mx-auto rounded-2xl overflow-hidden border"
      style={{
        borderColor: "var(--color-border-light)",
        background: "rgba(255, 253, 247, 0.75)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 24px 60px -20px rgba(61, 39, 16, 0.35)",
      }}
    >
      <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ borderColor: "var(--color-border-light)" }}>
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
          ServeSync — {TABS.find((t) => t.key === active)?.label}
        </span>
      </div>

      <div className="flex border-b" style={{ borderColor: "var(--color-border-light)" }} role="tablist" aria-label="Product preview">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-bold uppercase tracking-wide transition-colors focus:outline-none"
              style={{ color: isActive ? "var(--color-orange-500)" : "var(--color-text-muted)", borderBottom: isActive ? "2px solid var(--color-orange-500)" : "2px solid transparent" }}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      <div className="p-5 min-h-[280px]">
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
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Table T04 · Menu</p>
      {items.map((item) => (
        <div key={item.name} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: "var(--color-cream-100)" }}>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center" style={{ borderColor: item.veg ? "#16A34A" : "#DC2626" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.veg ? "#16A34A" : "#DC2626" }} />
            </span>
            <span className="text-xs font-bold" style={{ color: "var(--color-brown-900)" }}>{item.name}</span>
          </div>
          <span className="text-xs font-bold" style={{ color: "var(--color-orange-600)" }}>₹{item.price}</span>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-lg px-3 py-3 mt-2" style={{ background: "var(--color-orange-500)" }}>
        <span className="flex items-center gap-1.5 text-xs font-bold text-white"><ShoppingBag size={13} /> 3 items · ₹660</span>
        <span className="text-[10px] font-black uppercase text-white">Place Order</span>
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
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Live Tickets</p>
      {tickets.map((t) => (
        <div key={t.table} className="rounded-lg p-3" style={{ background: "#1E293B" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-white">Table {t.table}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: t.mins > 5 ? "#DC2626" : "#F59E0B", color: "white" }}>{t.mins} min</span>
          </div>
          {t.items.map((it) => (
            <p key={it} className="text-[11px] font-semibold text-slate-300">{it}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

function WaiterMock() {
  const tables = [
    { code: "T01", status: "Occupied", color: "#DC2626" },
    { code: "T02", status: "Bill Req.", color: "#F59E0B" },
    { code: "T03", status: "Free", color: "#16A34A" },
    { code: "T04", status: "Occupied", color: "#DC2626" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Table Overview</p>
        <Bell size={13} style={{ color: "var(--color-orange-500)" }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tables.map((t) => (
          <div key={t.code} className="rounded-lg p-3" style={{ background: "var(--color-cream-100)" }}>
            <p className="text-xs font-black" style={{ color: "var(--color-brown-900)" }}>{t.code}</p>
            <p className="text-[10px] font-bold uppercase" style={{ color: t.color }}>{t.status}</p>
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
      <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, var(--color-brown-900) 0%, #5C3D1A 100%)" }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">Revenue Today</p>
          <p className="text-xl font-black text-white">₹18,450</p>
        </div>
        <TrendingUp className="text-emerald-400" size={24} />
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {bars.map((h, i) => (
          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.06 * i, duration: 0.4 }} className="flex-1 rounded-t-sm" style={{ background: "var(--color-orange-500)" }} />
        ))}
      </div>
    </div>
  );
}
