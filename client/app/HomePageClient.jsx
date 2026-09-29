"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  PlayCircle,
  ArrowRight,
  QrCode,
  ChefHat,
  Users,
  Receipt,
  BarChart3,
  Sparkles,
  ClipboardCheck,
  ShieldCheck,
  PackageCheck,
} from "lucide-react";
import { PLATFORM_NAME } from "./lib/branding";
import MarketingNav from "./components/marketing/MarketingNav";
import MarketingFooter from "./components/marketing/MarketingFooter";
import HeroMockup from "./components/marketing/HeroMockup";
import TrustSection from "./components/marketing/TrustSection";
import InstallSection from "./components/marketing/InstallSection";
import FeatureCard from "./components/marketing/FeatureCard";
import TimelineStep from "./components/marketing/TimelineStep";
import TestimonialCard from "./components/marketing/TestimonialCard";
import CTASection from "./components/marketing/CTASection";
import Button from "./components/ui/Button";
import Section from "./components/ui/Section";
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
  { icon: PlayCircle, title: "Explore Demo", description: "Try the full ordering experience live on our demo restaurant — no signup needed." },
  { icon: ClipboardCheck, title: "Register Restaurant", description: "Submit your restaurant details and requested table count in a guided form." },
  { icon: ShieldCheck, title: "Verification", description: "Our platform team verifies your application and approves your account." },
  { icon: PackageCheck, title: "QR Kit Delivered", description: "Your QR kit, login credentials, and setup guide arrive by email and WhatsApp." },
];

export default function HomePageClient() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <MarketingNav />

      {/* Hero — two column on desktop, stacked on mobile */}
      <section className="relative overflow-hidden px-4 sm:px-6 pt-12 pb-16 sm:pt-16 sm:pb-20">
        {/* Decorative ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-40"
            style={{ background: "radial-gradient(circle, var(--ss-accent) 0%, transparent 70%)", filter: "blur(80px)" }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.12 } } }}
            className="flex flex-col items-center text-center lg:items-start lg:text-left"
          >
            <motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="ss-eyebrow mb-4"
            >
              QR Ordering · Real-Time Kitchen · Smart Billing · AI Insights
            </motion.p>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="ss-hero-heading mb-5"
            >
              Run Your Restaurant Smarter with {PLATFORM_NAME}
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="ss-body mb-8 max-w-md"
            >
              One platform for QR ordering, kitchen tickets, waiter tools, billing, and analytics — built for restaurants that want to move faster.
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full flex flex-col sm:flex-row sm:w-auto items-stretch sm:items-center gap-3"
            >
              <Button href="/demo" variant="primary" size="lg" icon={PlayCircle} fullWidthOnMobile>
                Explore Live Demo
              </Button>
              <Button href="/apply" variant="secondary" size="lg" icon={ArrowRight} iconPosition="right" fullWidthOnMobile>
                Register Restaurant
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            <HeroMockup />
          </motion.div>
        </div>
      </section>

      <TrustSection />

      {/* Features */}
      <Section
        eyebrow="Everything Included"
        title="One Platform, Every Part of the Restaurant"
        subtitle="From the first table scan to the end-of-day report."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} index={i} />
          ))}
        </div>
      </Section>

      {/* How It Works */}
      <Section eyebrow="How ServeSync Works" title="From Exploring the Demo to Taking Orders">
        <div className="flex flex-col sm:flex-row sm:items-start gap-0 sm:gap-4">
          {STEPS.map((step, i) => (
            <TimelineStep
              key={step.title}
              number={i + 1}
              icon={step.icon}
              title={step.title}
              description={step.description}
              index={i}
              last={i === STEPS.length - 1}
            />
          ))}
        </div>
      </Section>

      <InstallSection />

      {/* Testimonials */}
      <Section
        eyebrow="What Restaurants Say"
        title="Loved by Restaurant Teams"
        subtitle="Illustrative examples of the kind of impact ServeSync aims to deliver."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {SAMPLE_TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.name + i} {...t} index={i} />
          ))}
        </div>
      </Section>

      <CTASection />

      <MarketingFooter />
    </div>
  );
}
