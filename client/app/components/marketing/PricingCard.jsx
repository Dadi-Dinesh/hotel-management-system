"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

export default function PricingCard({ plan, index = 0 }) {
  const shouldReduceMotion = useReducedMotion();
  const isEnterprise = plan.key === "ENTERPRISE";

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : index * 0.08 }}
      className="relative flex flex-col p-7 rounded-3xl"
      style={{
        background: plan.highlight ? "var(--color-brown-900)" : "rgba(255, 253, 247, 0.85)",
        border: plan.highlight ? "2px solid var(--color-orange-500)" : "1px solid var(--color-border-light)",
        boxShadow: plan.highlight ? "0 24px 60px -20px rgba(61, 39, 16, 0.5)" : "0 12px 32px -18px rgba(61, 39, 16, 0.25)",
      }}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ background: "var(--color-orange-500)", color: "white" }}>
          <Sparkles size={11} /> Most Popular
        </span>
      )}

      <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: plan.highlight ? "var(--color-orange-400, #F5A855)" : "var(--color-orange-600)" }}>
        {plan.name}
      </p>
      <p className="text-xs mb-5" style={{ color: plan.highlight ? "rgba(255,253,247,0.7)" : "var(--color-text-muted)" }}>{plan.tagline}</p>

      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-3xl font-black" style={{ fontFamily: "var(--font-heading)", color: plan.highlight ? "white" : "var(--color-brown-900)" }}>
          {plan.priceLabel}
        </span>
        <span className="text-xs font-bold" style={{ color: plan.highlight ? "rgba(255,253,247,0.6)" : "var(--color-text-muted)" }}>{plan.period}</span>
      </div>

      <ul className="space-y-2.5 mb-7 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs font-semibold" style={{ color: plan.highlight ? "rgba(255,253,247,0.9)" : "var(--color-text-secondary)" }}>
            <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-orange-500)" }} />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={isEnterprise ? "/contact" : "/apply"}
        className="w-full py-3.5 text-center text-xs font-bold uppercase tracking-widest rounded-xl transition-transform hover:scale-[1.02]"
        style={{
          background: plan.highlight ? "var(--color-orange-500)" : "var(--color-brown-900)",
          color: "white",
        }}
      >
        {isEnterprise ? "Contact Sales" : "Apply for Your Restaurant"}
      </Link>
    </motion.div>
  );
}
