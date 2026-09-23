"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Shared empty-state illustration used across the customer portal:
 * empty cart, no orders, no search results, no menu items.
 */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center text-center py-14 px-6"
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{
          background: "linear-gradient(135deg, var(--color-cream-200), var(--color-cream-100))",
          border: "1px solid var(--color-border-light)",
        }}
      >
        {icon}
      </div>
      <p
        className="font-bold text-base uppercase tracking-widest mb-1.5"
        style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
      >
        {title}
      </p>
      {description && (
        <p
          className="text-xs max-w-xs mx-auto leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
