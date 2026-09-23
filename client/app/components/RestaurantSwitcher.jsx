"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronDown, Check, Globe } from "lucide-react";
import { useRestaurant } from "./RestaurantContext";

/**
 * Platform-Owner-only control for picking which restaurant's admin data to
 * view. Renders nothing for restaurant-scoped staff (they have no choice to
 * make — their own restaurant is hard-enforced server-side regardless).
 */
export default function RestaurantSwitcher() {
  const { isPlatformOwner, restaurants, selectedRestaurantId, selectRestaurant } = useRestaurant();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors"
        style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)", background: "var(--color-cream-100)" }}
      >
        {selected ? <Building2 size={14} /> : <Globe size={14} />}
        {selected ? selected.name : "Platform-wide"}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1.5 w-64 rounded-xl border shadow-xl z-30 overflow-hidden max-h-80 overflow-y-auto"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border-light)" }}
          >
            <button
              onClick={() => handleSelect(null)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-bold text-left hover:bg-cream-100 transition-colors"
              style={{ color: "var(--color-brown-900)" }}
            >
              <span className="flex items-center gap-2">
                <Globe size={14} /> Platform-wide
              </span>
              {!selectedRestaurantId && <Check size={14} style={{ color: "var(--color-success)" }} />}
            </button>
            {restaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r.id)}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-bold text-left hover:bg-cream-100 transition-colors border-t"
                style={{ color: "var(--color-brown-900)", borderColor: "var(--color-border-light)" }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Building2 size={14} className="flex-shrink-0" />
                  <span className="truncate">{r.name}</span>
                </span>
                {selectedRestaurantId === r.id && <Check size={14} style={{ color: "var(--color-success)" }} className="flex-shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
