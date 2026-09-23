"use client";

import { motion, useReducedMotion } from "framer-motion";

/** One step in the "How It Works" timeline. `last` hides the connector line. */
export default function TimelineStep({ number, icon: Icon, title, description, index = 0, last = false }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : index * 0.12 }}
      className="relative flex flex-col items-center text-center flex-1"
    >
      {!last && (
        <motion.div
          initial={shouldReduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: shouldReduceMotion ? 0 : index * 0.12 + 0.2 }}
          className="hidden sm:block absolute top-8 left-1/2 w-full h-0.5 origin-left"
          style={{ background: "linear-gradient(90deg, var(--color-orange-500), var(--color-border-light))" }}
          aria-hidden="true"
        />
      )}
      <div
        className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--color-brown-900)", boxShadow: "0 10px 24px -10px rgba(61,39,16,0.5)" }}
      >
        <Icon size={26} color="var(--color-orange-500)" />
        <span
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
          style={{ background: "var(--color-orange-500)", color: "white" }}
        >
          {number}
        </span>
      </div>
      <h3 className="text-sm font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--color-brown-900)" }}>{title}</h3>
      <p className="text-xs leading-relaxed max-w-[220px]" style={{ color: "var(--color-text-secondary)" }}>{description}</p>
    </motion.div>
  );
}
