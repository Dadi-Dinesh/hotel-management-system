"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Quote } from "lucide-react";
import Card from "../ui/Card";

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
      className="h-full"
    >
      <Card padding="sm" className="relative h-full flex flex-col gap-4">
        <span
          className="absolute top-4 right-4 ss-caption font-bold uppercase px-2.5 py-1 rounded-full"
          style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}
        >
          Sample
        </span>
        <Quote size={22} style={{ color: "var(--ss-accent)" }} aria-hidden="true" />
        <p className="ss-body italic flex-1" style={{ color: "var(--ss-primary)" }}>&ldquo;{quote}&rdquo;</p>
        <div>
          <p className="ss-small font-bold" style={{ color: "var(--ss-primary)" }}>{name}</p>
          <p className="ss-caption">{role} · {restaurant}</p>
        </div>
      </Card>
    </motion.div>
  );
}
