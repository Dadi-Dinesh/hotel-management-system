"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function FAQAccordion({ items }) {
  const shouldReduceMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={item.question}
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: "var(--color-border-light)", background: "rgba(255,253,247,0.75)" }}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left focus:outline-none focus-visible:ring-2"
              style={{ outlineColor: "var(--color-orange-500)" }}
              aria-expanded={isOpen}
            >
              <span className="text-sm font-bold" style={{ color: "var(--color-brown-900)" }}>{item.question}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                className="flex-shrink-0"
                style={{ color: "var(--color-orange-500)" }}
              >
                <ChevronDown size={18} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
