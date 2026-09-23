"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";

export default function CTASection({ title = "Ready to run your restaurant smarter?", subtitle = "Set up your restaurant on ServeSync in minutes — no credit card required." }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-6 py-16 text-center"
    >
      <div
        className="rounded-3xl p-10 sm:p-14"
        style={{ background: "linear-gradient(135deg, var(--color-brown-900) 0%, #5C3D1A 100%)", boxShadow: "0 30px 70px -30px rgba(61,39,16,0.5)" }}
      >
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-3" style={{ fontFamily: "var(--font-heading)", color: "white" }}>
          {title}
        </h2>
        <p className="text-sm mb-8 max-w-lg mx-auto" style={{ color: "rgba(255,253,247,0.75)" }}>{subtitle}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/onboard" className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 text-xs font-bold uppercase tracking-widest">
            Start Free Trial <ArrowRight size={15} />
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 px-7 py-3.5 text-xs font-bold uppercase tracking-widest rounded-xl border-2"
            style={{ borderColor: "rgba(255,253,247,0.4)", color: "white" }}
          >
            <PlayCircle size={15} /> Use Live Demo
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
