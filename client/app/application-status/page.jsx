"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Search, Clock, CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import api from "../lib/api";
import { PLATFORM_NAME } from "../lib/branding";
import toast from "react-hot-toast";

const STATUS_META = {
  PENDING: { icon: Clock, label: "Under Review", color: "#B45309", bg: "#FEF3C7" },
  APPROVED: { icon: CheckCircle2, label: "Approved", color: "#065F46", bg: "#ECFDF5" },
  REJECTED: { icon: XCircle, label: "Not Approved", color: "#991B1B", bg: "#FEF2F2" },
};

export default function ApplicationStatusPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!email.trim() || !phone.trim()) {
      toast.error("Please enter both your email and phone number.");
      return;
    }
    setLoading(true);
    setResult(null);
    setNotFound(false);
    try {
      const res = await api.post("/applications/status", { email: email.trim(), phone: phone.trim() });
      setResult(res.data.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const meta = result ? STATUS_META[result.status] : null;
  const StatusIcon = meta?.icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: "var(--color-surface, #FFFDF7)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>
            {PLATFORM_NAME}
          </p>
          <h1 className="text-2xl font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Check Your Application Status
          </h1>
        </div>

        <form
          onSubmit={handleCheck}
          className="rounded-2xl border p-6 space-y-3"
          style={{ borderColor: "var(--color-border-light)", background: "#fff" }}
        >
          <input
            type="email"
            className="input"
            placeholder="Email used on your application"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            type="tel"
            className="input"
            placeholder="Phone number used on your application"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? "Checking..." : "Check Status"}
          </button>
        </form>

        {notFound && (
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs mt-4"
            style={{ color: "var(--color-text-muted)" }}
          >
            No application found matching that email and phone number.
          </motion.p>
        )}

        {result && meta && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-6 mt-4 text-center"
            style={{ borderColor: "var(--color-border-light)", background: "#fff" }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: meta.bg, color: meta.color }}
            >
              <StatusIcon size={28} />
            </div>
            <p className="font-black text-lg mb-1" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              {result.restaurantName}
            </p>
            <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: meta.color }}>
              {meta.label}
            </p>
            {result.status === "REJECTED" && result.rejectionReason && (
              <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {result.rejectionReason}
              </p>
            )}
            {result.status === "APPROVED" && (
              <Link href="/admin/login" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider">
                Log In to Your Dashboard <ArrowRight size={14} />
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
