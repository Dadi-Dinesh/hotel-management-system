"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import Button from "../ui/Button";

export default function CTASection({
  title = "Ready to run your restaurant smarter?",
  subtitle = "Explore the live demo, or apply to get your own restaurant reviewed and set up on ServeSync.",
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
    >
      <div
        className="rounded-[var(--ss-radius-modal)] p-8 sm:p-16 text-center"
        style={{ background: "var(--ss-primary)", boxShadow: "var(--ss-shadow-lg)" }}
      >
        <h2 className="ss-h2 mb-3" style={{ color: "var(--ss-on-accent)" }}>
          {title}
        </h2>
        <p className="ss-body mb-8 max-w-lg mx-auto" style={{ color: "rgba(255,253,248,0.75)" }}>
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button href="/demo" variant="primary" size="lg" icon={PlayCircle} fullWidthOnMobile>
            Explore Live Demo
          </Button>
          <Button
            href="/apply"
            variant="secondary"
            size="lg"
            icon={ArrowRight}
            iconPosition="right"
            fullWidthOnMobile
            style={{ background: "transparent", borderColor: "rgba(255,253,248,0.35)", color: "var(--ss-on-accent)" }}
          >
            Register Restaurant
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
