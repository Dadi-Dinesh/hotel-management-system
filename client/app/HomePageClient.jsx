"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, PlayCircle, QrCode, ChefHat, Users, Receipt, BarChart3, Sparkles, Store, Printer, ClipboardCheck } from "lucide-react";
import { PLATFORM_NAME } from "./lib/branding";
import MarketingNav from "./components/marketing/MarketingNav";
import MarketingFooter from "./components/marketing/MarketingFooter";
import HeroMockup from "./components/marketing/HeroMockup";
import FeatureCard from "./components/marketing/FeatureCard";
import TimelineStep from "./components/marketing/TimelineStep";
import TestimonialCard from "./components/marketing/TestimonialCard";
import CTASection from "./components/marketing/CTASection";
import { SAMPLE_TESTIMONIALS } from "./lib/marketing/testimonials";

const FEATURES = [
  { icon: QrCode, title: "QR Ordering", description: "Guests scan a table QR and order in seconds — no app required." },
  { icon: ChefHat, title: "Real-Time Kitchen", description: "Orders hit the kitchen display the instant they're placed." },
  { icon: Users, title: "Waiter Dashboard", description: "Live tables, reminders, and bill requests in one place." },
  { icon: Receipt, title: "Smart Billing & Printing", description: "Auto-calculated bills with thermal, network, or browser printing." },
  { icon: BarChart3, title: "Admin Analytics", description: "Revenue, top sellers, and peak hours at a glance." },
  { icon: Sparkles, title: "AI Copilot", description: "Daily insights and suggestions computed from your own data." },
];

const STEPS = [
  { icon: Store, title: "Create Restaurant", description: "Set up your restaurant profile and branding in minutes." },
  { icon: ClipboardCheck, title: "Create Tables", description: "Add your tables — ServeSync generates secure QR tokens for each." },
  { icon: Printer, title: "Print QR", description: "Download or print QR posters, ready to place on every table." },
  { icon: QrCode, title: "Start Receiving Orders", description: "Guests scan, order, and your kitchen sees it live." },
];

export default function HomePageClient() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--color-surface)" }}>
      {/* Decorative ambient gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-30" style={{ background: "radial-gradient(circle, var(--color-orange-500) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, var(--color-brown-900) 0%, transparent 70%)", filter: "blur(70px)" }} />
      </div>

      <MarketingNav />

      {/* Hero */}
      <section className="relative px-6 pt-16 pb-20 sm:pt-24 sm:pb-24 text-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
          className="max-w-3xl mx-auto flex flex-col items-center"
        >
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-4xl sm:text-5xl md:text-6xl font-black mb-5 uppercase tracking-tighter leading-[1.05]"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
          >
            Run Your Restaurant Smarter with {PLATFORM_NAME}
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-sm sm:text-base font-bold uppercase tracking-widest mb-9"
            style={{ color: "var(--color-orange-600)" }}
          >
            QR Ordering • Real-Time Kitchen • Smart Billing • AI Insights
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center gap-3 mb-16"
          >
            <Link href="/onboard" className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-widest shadow-lg" style={{ borderRadius: "9999px" }}>
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-widest border-2"
              style={{ borderRadius: "9999px", borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
            >
              <PlayCircle size={16} /> Use Live Demo
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero mockup */}
        <div className="w-full">
          <HeroMockup />
        </div>
      </section>

      {/* How It Works */}
      <section className="relative px-6 py-16 sm:py-20 max-w-5xl mx-auto w-full">
        <motion.div initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-orange-600)" }}>How It Works</p>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            From Signup to Serving, in Four Steps
          </h2>
        </motion.div>
        <div className="flex flex-col sm:flex-row items-start gap-10 sm:gap-4">
          {STEPS.map((step, i) => (
            <TimelineStep key={step.title} number={i + 1} icon={step.icon} title={step.title} description={step.description} index={i} last={i === STEPS.length - 1} />
          ))}
        </div>
      </section>

      {/* Features teaser */}
      <section className="relative px-6 py-16 sm:py-20 max-w-5xl mx-auto w-full">
        <motion.div initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-orange-600)" }}>Everything Included</p>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            One Platform, Every Part of the Restaurant
          </h2>
          <Link href="/features" className="text-xs font-bold uppercase tracking-widest underline underline-offset-4" style={{ color: "var(--color-brown-900)" }}>
            See all features →
          </Link>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} index={i} />
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative px-6 py-16 sm:py-20 max-w-5xl mx-auto w-full">
        <motion.div initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-orange-600)" }}>What Restaurants Say</p>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Loved by Restaurant Teams
          </h2>
          <p className="text-[11px] font-semibold mt-2" style={{ color: "var(--color-text-muted)" }}>Illustrative examples of the kind of impact ServeSync aims to deliver.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {SAMPLE_TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.name + i} {...t} index={i} />
          ))}
        </div>
      </section>

      <CTASection />

      <MarketingFooter />
    </div>
  );
}
