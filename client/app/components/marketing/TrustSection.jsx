"use client";

import { motion, useReducedMotion } from "framer-motion";
import { WifiOff, PlayCircle, Radio, Smartphone } from "lucide-react";
import StatBadge from "../ui/StatBadge";

const TRUST_ITEMS = [
  { icon: WifiOff, label: "Works Without an App" },
  { icon: PlayCircle, label: "Live Demo Available" },
  { icon: Radio, label: "Real-Time Orders" },
  { icon: Smartphone, label: "Multi-Device Ready" },
];

/** Compact trust strip between the hero and the feature grid. */
export default function TrustSection() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <section className="px-4 sm:px-6 py-8">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-3"
      >
        {TRUST_ITEMS.map((item) => (
          <StatBadge key={item.label} icon={item.icon} label={item.label} />
        ))}
      </motion.div>
    </section>
  );
}
