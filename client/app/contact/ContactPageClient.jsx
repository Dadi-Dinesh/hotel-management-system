"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, MessageSquare, Building2, Send, CheckCircle2 } from "lucide-react";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import toast from "react-hot-toast";

/** No backend email integration yet (Phase 11 scope) — submitting shows a
 * clear local confirmation rather than silently pretending to send mail. */
export default function ContactPageClient() {
  const shouldReduceMotion = useReducedMotion();
  const [form, setForm] = useState({ name: "", email: "", restaurant: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Thanks — we've noted your message. We'll be in touch soon.");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface)" }}>
      <MarketingNav />

      <main className="flex-1">
        <section className="px-6 pt-16 pb-10 text-center max-w-2xl mx-auto">
          <motion.p initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-orange-600)" }}>
            Contact
          </motion.p>
          <motion.h1 initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Let&apos;s Talk
          </motion.h1>
          <motion.p initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Questions about ServeSync, a feature request, or interested in Enterprise? Reach out below.
          </motion.p>
        </section>

        <section className="px-6 pb-20 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact info */}
          <motion.div initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="space-y-4">
            <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--color-border-light)", background: "rgba(255,253,247,0.75)" }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--color-orange-500)", color: "white" }}>
                <Mail size={18} />
              </span>
              <h3 className="text-sm font-black uppercase tracking-wide mb-1" style={{ color: "var(--color-brown-900)" }}>Email</h3>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>hello@servesync.app</p>
            </div>
            <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--color-border-light)", background: "rgba(255,253,247,0.75)" }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--color-orange-500)", color: "white" }}>
                <Building2 size={18} />
              </span>
              <h3 className="text-sm font-black uppercase tracking-wide mb-1" style={{ color: "var(--color-brown-900)" }}>Business Inquiries</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Multi-branch groups, partnerships, or Enterprise plans — mention it in your message and we&apos;ll route it to the right team.
              </p>
            </div>
            <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--color-border-light)", background: "rgba(255,253,247,0.75)" }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--color-orange-500)", color: "white" }}>
                <MessageSquare size={18} />
              </span>
              <h3 className="text-sm font-black uppercase tracking-wide mb-1" style={{ color: "var(--color-brown-900)" }}>Prefer to explore first?</h3>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Try the <a href="/demo" className="underline font-bold">Live Demo</a> — no signup required.</p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }}>
            {submitted ? (
              <div className="p-8 rounded-2xl border-2 text-center flex flex-col items-center gap-3" style={{ borderColor: "var(--color-success)", background: "#ECFDF5" }}>
                <CheckCircle2 size={36} style={{ color: "var(--color-success)" }} />
                <p className="text-sm font-bold" style={{ color: "#065F46" }}>Message received!</p>
                <p className="text-xs" style={{ color: "#065F46" }}>This form doesn&apos;t send email yet — we&apos;ve simply confirmed your submission locally.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 rounded-2xl border space-y-4" style={{ borderColor: "var(--color-border-light)", background: "rgba(255,253,247,0.85)" }}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Name</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Email</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="you@restaurant.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Restaurant Name (optional)</label>
                  <input value={form.restaurant} onChange={(e) => setForm({ ...form, restaurant: e.target.value })} className="input" placeholder="e.g. Spice Garden" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Message</label>
                  <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input resize-none" placeholder="How can we help?" />
                </div>
                <button type="submit" className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                  <Send size={14} /> Send Message
                </button>
              </form>
            )}
          </motion.div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
