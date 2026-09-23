"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function FeatureCard({ icon: Icon, title, description, index = 0 }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : Math.min(index * 0.06, 0.3) }}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      tabIndex={0}
      className="flex flex-col gap-3 p-6 rounded-2xl text-left focus:outline-none focus-visible:ring-2"
      style={{
        background: "rgba(255, 253, 247, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid var(--color-border-light)",
        boxShadow: "0 8px 24px -14px rgba(61, 39, 16, 0.3)",
        outlineColor: "var(--color-orange-500)",
      }}
    >
      <span className="w-12 h-12 flex items-center justify-center rounded-xl" style={{ background: "var(--color-orange-500)", color: "white" }}>
        <Icon size={22} />
      </span>
      <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: "var(--color-brown-900)" }}>{title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{description}</p>
    </motion.div>
  );
}
