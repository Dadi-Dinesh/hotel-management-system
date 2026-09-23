"use client";

import { motion, useReducedMotion } from "framer-motion";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import FAQAccordion from "../components/marketing/FAQAccordion";
import CTASection from "../components/marketing/CTASection";

const FAQ_ITEMS = [
  { question: "How does QR ordering work?", answer: "Each table gets a unique QR code. Guests scan it with their phone camera, browse your menu, and place orders directly — no app download, no waiter needed to take the order." },
  { question: "Can I use my own printer?", answer: "Yes. ServeSync's Universal Print Engine supports ESC/POS thermal printers (USB/serial), network (IP) printers, Bluetooth printers, and plain browser/PDF printing for any regular printer — pick whichever you already own." },
  { question: "Does it work offline?", answer: "ServeSync is a Progressive Web App — it can be installed on a device and continues working through brief connectivity drops. Orders, feedback, and bill requests placed while offline are queued and sent automatically once you're back online." },
  { question: "Can I manage multiple restaurants?", answer: "Yes. ServeSync is built multi-tenant from the ground up — each restaurant gets its own isolated, branded space, and a Platform Owner account can switch between managing several." },
  { question: "Is there a free plan?", answer: "Every new restaurant starts with a 14-day free trial with no credit card required. See the Pricing page for what's included at each tier." },
  { question: "How long does setup take?", answer: "Most restaurants are live within minutes — the onboarding wizard walks you through branding, tables, and QR generation in one guided flow." },
  { question: "Is my restaurant's data isolated from others?", answer: "Yes — every order, menu item, table, and setting is scoped to your restaurant at the database level. No restaurant can see another's data." },
  { question: "Can I try it without creating an account?", answer: "Yes — use the Live Demo to experience the full customer ordering flow on our demo restaurant, no signup required." },
];

export default function FAQPageClient() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface)" }}>
      <MarketingNav />

      <main className="flex-1">
        <section className="px-6 pt-16 pb-10 text-center max-w-2xl mx-auto">
          <motion.p initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-orange-600)" }}>
            FAQ
          </motion.p>
          <motion.h1 initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Frequently Asked Questions
          </motion.h1>
        </section>

        <section className="px-6 pb-16 max-w-2xl mx-auto">
          <FAQAccordion items={FAQ_ITEMS} />
        </section>

        <CTASection />
      </main>

      <MarketingFooter />
    </div>
  );
}
