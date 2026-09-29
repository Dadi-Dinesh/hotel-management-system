"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

const SIZES = {
  sm: { btn: "w-7 h-7", text: "text-xs", count: "min-w-[22px]", icon: 13 },
  md: { btn: "w-9 h-9", text: "text-sm", count: "min-w-[28px]", icon: 15 },
};

/**
 * Shared minus / count / plus control used by MenuCard and CartDrawer.
 * When `quantity` is 0 and `onAdd` is given, renders a single "Add" pill
 * instead of a stepper — matching the existing add-then-adjust flow.
 */
export default function QuantitySelector({
  quantity = 0,
  onAdd,
  onIncrement,
  onDecrement,
  addLabel = "Add to Cart",
  size = "md",
  fullWidthAdd = false,
}) {
  const shouldReduceMotion = useReducedMotion();
  const s = SIZES[size] ?? SIZES.md;

  if (quantity <= 0 && onAdd) {
    return (
      <motion.button
        type="button"
        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
        onClick={onAdd}
        className={`ss-btn inline-flex items-center justify-center gap-1.5 font-semibold ${s.text} py-2.5 ${fullWidthAdd ? "w-full" : "px-5"}`}
        data-variant="primary"
        style={{
          background: "var(--ss-accent)",
          color: "var(--ss-on-accent)",
          borderRadius: "var(--ss-radius-button)",
        }}
      >
        <Plus size={s.icon} /> {addLabel}
      </motion.button>
    );
  }

  return (
    <div
      className="inline-flex items-center rounded-full overflow-hidden flex-shrink-0"
      style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label="Decrease quantity"
        className={`${s.btn} flex items-center justify-center transition-colors`}
        style={{ color: "var(--ss-primary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ss-bg)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Minus size={s.icon} />
      </button>
      <span className={`${s.count} ${s.text} text-center font-bold overflow-hidden relative`} style={{ color: "var(--ss-primary)" }} aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={quantity}
            initial={shouldReduceMotion ? { opacity: 0 } : { y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: -8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="block"
          >
            {quantity}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Increase quantity"
        className={`${s.btn} flex items-center justify-center transition-colors`}
        style={{ color: "var(--ss-primary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ss-bg)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Plus size={s.icon} />
      </button>
    </div>
  );
}
