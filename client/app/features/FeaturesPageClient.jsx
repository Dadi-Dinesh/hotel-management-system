"use client";

import { motion, useReducedMotion } from "framer-motion";
import { QrCode, Clock, MessageSquare, Users, ChefHat, Printer, BarChart3, Sparkles, Building2 } from "lucide-react";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import FeatureCard from "../components/marketing/FeatureCard";
import CTASection from "../components/marketing/CTASection";

const GROUPS = [
  {
    key: "customer",
    title: "Customer Experience",
    description: "What your guests see and feel at the table.",
    features: [
      { icon: QrCode, title: "QR Ordering", description: "Guests scan a table QR and order in seconds — no app download required." },
      { icon: Clock, title: "Live Order Tracking", description: "Real-time status updates from placed to preparing to served." },
      { icon: MessageSquare, title: "Feedback & Ratings", description: "Guests rate dishes and leave comments right from their table." },
    ],
  },
  {
    key: "operations",
    title: "Operations",
    description: "The tools your floor and kitchen staff run on every shift.",
    features: [
      { icon: Users, title: "Waiter Dashboard", description: "Live tables, reminders, bill requests, and order status — one screen." },
      { icon: ChefHat, title: "Kitchen Display", description: "Orders hit the kitchen the instant they're placed, grouped and prioritized." },
      { icon: Printer, title: "Universal Printing", description: "Thermal, network, Bluetooth, or plain browser printing — your printer, your choice." },
    ],
  },
  {
    key: "management",
    title: "Management",
    description: "What owners and managers use to run the business.",
    features: [
      { icon: BarChart3, title: "Admin Analytics", description: "Revenue trends, top sellers, peak hours, and table utilization at a glance." },
      { icon: Sparkles, title: "AI Copilot", description: "Daily insights, trend comparisons, and an Ask-AI assistant — computed from your own data." },
      { icon: Building2, title: "Multi-Tenant SaaS", description: "Every restaurant gets its own branded, isolated space on the same platform." },
    ],
  },
];

export default function FeaturesPageClient() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface)" }}>
      <MarketingNav />

      <main className="flex-1">
        <section className="px-6 pt-16 pb-10 text-center max-w-3xl mx-auto">
          <motion.p initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-orange-600)" }}>
            Features
          </motion.p>
          <motion.h1 initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Everything Your Restaurant Needs
          </motion.h1>
          <motion.p initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            From the moment a guest scans a QR code to the moment you close the books — one connected platform.
          </motion.p>
        </section>

        {GROUPS.map((group, gi) => (
          <section key={group.key} className="px-6 py-12 max-w-5xl mx-auto">
            <motion.div initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="mb-8">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-1.5" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>{group.title}</h2>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{group.description}</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {group.features.map((f, i) => (
                <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} index={gi * 3 + i} />
              ))}
            </div>
          </section>
        ))}

        <CTASection />
      </main>

      <MarketingFooter />
    </div>
  );
}
