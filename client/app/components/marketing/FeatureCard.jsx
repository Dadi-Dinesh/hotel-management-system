"use client";

import { motion, useReducedMotion } from "framer-motion";
import Card from "../ui/Card";

export default function FeatureCard({ icon: Icon, title, description, index = 0 }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : Math.min(index * 0.06, 0.3) }}
      className="h-full"
    >
      <Card padding="sm" hover className="h-full flex flex-col gap-4 text-left focus-within:outline-none">
        <span
          className="w-12 h-12 flex items-center justify-center rounded-2xl flex-shrink-0"
          style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}
        >
          <Icon size={22} aria-hidden="true" />
        </span>
        <div>
          <h3 className="ss-h3 mb-1.5">{title}</h3>
          <p className="ss-small leading-relaxed">{description}</p>
        </div>
      </Card>
    </motion.div>
  );
}
