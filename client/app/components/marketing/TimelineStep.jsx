"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * One step in the "How It Works" timeline.
 * Desktop: horizontal row with a connecting line running through the
 * numbered badges. Mobile: compact vertical stack with a connecting line
 * running down the left edge. `last` hides the connector for that step.
 */
export default function TimelineStep({ number, icon: Icon, title, description, index = 0, last = false }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : index * 0.1 }}
      className="relative flex sm:flex-col items-start sm:items-center gap-4 sm:gap-0 sm:text-center sm:flex-1 pb-8 sm:pb-0"
    >
      {/* Desktop horizontal connector */}
      {!last && (
        <motion.div
          initial={shouldReduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: shouldReduceMotion ? 0 : index * 0.1 + 0.2 }}
          className="hidden sm:block absolute top-7 left-1/2 w-full h-px origin-left"
          style={{ background: "var(--ss-border)" }}
          aria-hidden="true"
        />
      )}

      {/* Mobile vertical connector */}
      {!last && (
        <div
          className="sm:hidden absolute left-7 top-14 bottom-0 w-px"
          style={{ background: "var(--ss-border)" }}
          aria-hidden="true"
        />
      )}

      <div
        className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 sm:mb-4"
        style={{ background: "var(--ss-primary)", boxShadow: "var(--ss-shadow-sm)" }}
      >
        <Icon size={22} style={{ color: "var(--ss-accent)" }} aria-hidden="true" />
        <span
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
          style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)" }}
        >
          {number}
        </span>
      </div>
      <div className="sm:max-w-[200px]">
        <h3 className="ss-h3 mb-1">{title}</h3>
        <p className="ss-small leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}
