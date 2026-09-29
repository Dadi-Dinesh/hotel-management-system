"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronDown, Check, Globe, Search } from "lucide-react";
import { useRestaurant } from "./RestaurantContext";

/**
 * Platform-Owner-only control for picking which restaurant's admin data to
 * view. Renders nothing for restaurant-scoped staff (they have no choice to
 * make — their own restaurant is hard-enforced server-side regardless).
 */
export default function RestaurantSwitcher() {
  const { isPlatformOwner, restaurants, selectedRestaurantId, selectRestaurant } = useRestaurant();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return restaurants;
    const q = query.toLowerCase();
    return restaurants.filter((r) => r.name.toLowerCase().includes(q));
  }, [restaurants, query]);

  if (!isPlatformOwner) return null;

  const selected = restaurants.find((r) => r.id === selectedRestaurantId);

  const handleSelect = (restaurantId) => {
    selectRestaurant(restaurantId);
    setOpen(false);
    // Reload so every page's data refetches under the new tenant context.
    window.location.reload();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="ss-btn flex items-center gap-2 px-3 py-2 rounded-full ss-caption font-bold"
        data-variant="secondary"
        style={{ border: "1px solid var(--ss-border)", color: "var(--ss-primary)", background: "var(--ss-bg)" }}
      >
        {selected ? <Building2 size={13} /> : <Globe size={13} />}
        <span className="max-w-[120px] truncate">{selected ? selected.name : "Platform-wide"}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1.5 w-72 rounded-2xl z-30 overflow-hidden max-h-96 flex flex-col"
            style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", boxShadow: "var(--ss-shadow-lg)" }}
          >
            <div className="p-2 border-b flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ss-secondary)" }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search restaurants..."
                  className="ss-input w-full h-9 pl-8 pr-3 ss-caption font-semibold"
                  style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)", borderRadius: "var(--ss-radius-input)", color: "var(--ss-primary)" }}
                />
              </div>
            </div>

            <div className="overflow-y-auto">
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 ss-small font-bold text-left transition-colors"
                style={{ color: "var(--ss-primary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ss-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span className="flex items-center gap-2">
                  <Globe size={14} /> Platform-wide
                </span>
                {!selectedRestaurantId && <Check size={14} style={{ color: "var(--ss-success)" }} />}
              </button>
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 ss-small font-bold text-left border-t transition-colors"
                  style={{ color: "var(--ss-primary)", borderColor: "var(--ss-border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ss-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Building2 size={14} className="flex-shrink-0" />
                    <span className="truncate">{r.name}</span>
                  </span>
                  {selectedRestaurantId === r.id && (
                    <span
                      className="ss-caption font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}
                    >
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="ss-caption text-center py-4" style={{ color: "var(--ss-secondary)" }}>
                  No restaurants match &quot;{query}&quot;
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
