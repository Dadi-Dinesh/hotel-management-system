"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import PricingCard from "../components/marketing/PricingCard";
import FAQAccordion from "../components/marketing/FAQAccordion";
import { PLANS } from "../lib/marketing/plans";

const PRICING_FAQ = [
  { question: "Do I need a credit card to start?", answer: "No — the Starter plan is a full 14-day free trial with no card required. You can explore every core feature before deciding on a plan." },
  { question: "Can I switch plans later?", answer: "Yes. As your restaurant grows you can move from Starter to Growth, or talk to us about Enterprise for multi-branch operations." },
  { question: "Is billing live yet?", answer: "Not yet — pricing shown here reflects our planned plans. Payment processing is coming in a future update; today every new restaurant starts on a free trial." },
];

export default function PricingPageClient() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface)" }}>
      <MarketingNav />

      <main className="flex-1">
        <section className="px-6 pt-16 pb-12 text-center max-w-2xl mx-auto">
          <motion.p initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-orange-600)" }}>
            Pricing
          </motion.p>
          <motion.h1 initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Simple, Honest Pricing
          </motion.h1>
          <motion.p initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
            Start free. Upgrade when you&apos;re ready. No hidden fees.
          </motion.p>
          <motion.p initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            <ShieldCheck size={13} /> Payment processing coming soon — every plan starts as a free trial today.
          </motion.p>
        </section>

        <section className="px-6 pb-20 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((plan, i) => (
              <PricingCard key={plan.key} plan={plan} index={i} />
            ))}
          </div>
        </section>

        <section className="px-6 pb-20 max-w-2xl mx-auto">
          <h2 className="text-xl font-black uppercase tracking-tight text-center mb-6" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Pricing Questions
          </h2>
          <FAQAccordion items={PRICING_FAQ} />
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
