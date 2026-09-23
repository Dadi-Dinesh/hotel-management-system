"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Quote } from "lucide-react";

/** Illustrative-only — every testimonial rendered with this component must
 * carry `sampleText` in the data (see marketing/testimonials.js), which
 * shows a persistent "Sample" badge so it's never mistaken for a real
 * customer endorsement. */
export default function TestimonialCard({ quote, name, role, restaurant, index = 0 }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : index * 0.08 }}
      className="relative flex flex-col gap-4 p-6 rounded-2xl"
      style={{ background: "rgba(255, 253, 247, 0.8)", border: "1px solid var(--color-border-light)", boxShadow: "0 10px 28px -18px rgba(61, 39, 16, 0.3)" }}
    >
      <span className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: "#FEF3C7", color: "#92400E" }}>
        Sample
      </span>
      <Quote size={22} style={{ color: "var(--color-orange-500)" }} />
      <p className="text-sm font-medium leading-relaxed italic" style={{ color: "var(--color-brown-900)" }}>&ldquo;{quote}&rdquo;</p>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-brown-900)" }}>{name}</p>
        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{role} · {restaurant}</p>
      </div>
    </motion.div>
  );
}
