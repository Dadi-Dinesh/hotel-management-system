"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Design-system section wrapper — consistent max-width container, 8pt
 * vertical rhythm (py-12 / py-16), and an optional centered
 * eyebrow + title + subtitle header used across the landing page.
 */
export default function Section({
  id,
  eyebrow,
  title,
  subtitle,
  align = "center",
  className = "",
  headerClassName = "",
  children,
}) {
  const shouldReduceMotion = useReducedMotion();
  const hasHeader = Boolean(eyebrow || title || subtitle);

  return (
    <section id={id} className={`px-4 sm:px-6 py-12 sm:py-16 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {hasHeader && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className={`mb-12 ${align === "center" ? "text-center max-w-2xl mx-auto" : ""} ${headerClassName}`}
          >
            {eyebrow && <p className="ss-eyebrow mb-2">{eyebrow}</p>}
            {title && <h2 className="ss-h2 mb-3">{title}</h2>}
            {subtitle && <p className="ss-body">{subtitle}</p>}
          </motion.div>
        )}
        {children}
      </div>
    </section>
  );
}
