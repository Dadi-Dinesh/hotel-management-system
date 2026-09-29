"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CreditCard, Clock, Store, ArrowUpCircle, CheckCircle2, Mail } from "lucide-react";
import api from "../../lib/api";
import { getUser, isAuthenticated } from "../../lib/auth";
import { useRestaurant } from "../../components/RestaurantContext";
import DashboardHeader from "../../components/admin/DashboardHeader";
import { PLANS, resolvePlanDisplay } from "../../lib/marketing/plans";
import toast from "react-hot-toast";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export default function AccountPage() {
  const router = useRouter();
  const { restaurant: contextRestaurant } = useRestaurant();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingEmail, setBillingEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    if (!contextRestaurant?.slug) return;
    api
      .get(`/restaurants/${contextRestaurant.slug}/settings`)
      .then((res) => {
        setRestaurant(res.data.data);
        setBillingEmail(res.data.data.billingEmail || "");
      })
      .catch(() => toast.error("Failed to load account details"))
      .finally(() => setLoading(false));
  }, [contextRestaurant]);

  const handleSaveBillingEmail = async () => {
    if (!restaurant?.slug) return;
    setSaving(true);
    try {
      await api.patch(`/restaurants/${restaurant.slug}/settings`, { billingEmail });
      toast.success("Billing email saved.");
    } catch {
      toast.error("Failed to save billing email.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-surface)" }}>
        <div className="animate-pulse text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Loading account...</div>
      </div>
    );
  }

  const planDisplay = resolvePlanDisplay(restaurant.plan);
  const trialDays = daysUntil(restaurant.trialEndsAt);
  const isTrialing = restaurant.subscriptionStatus === "TRIALING";
  const trialExpired = isTrialing && trialDays !== null && trialDays <= 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <DashboardHeader title="Account" subtitle="Plan & Billing" />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Current Plan */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <CreditCard size={16} style={{ color: "var(--color-orange-500)" }} /> Current Plan
          </h2>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-2xl font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>{planDisplay.name}</p>
              <span
                className="inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full"
                style={{
                  background: trialExpired ? "#FEF2F2" : "#ECFDF5",
                  color: trialExpired ? "#991B1B" : "#065F46",
                }}
              >
                <CheckCircle2 size={11} /> {restaurant.subscriptionStatus}
              </span>
            </div>
            <Link href="/pricing" className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider">
              <ArrowUpCircle size={14} /> Upgrade Plan
            </Link>
          </div>
        </motion.section>

        {/* Trial Status */}
        {isTrialing && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl p-5 border" style={{ borderColor: trialExpired ? "#FCA5A5" : "var(--color-border-light)", background: trialExpired ? "#FEF2F2" : "var(--color-surface)" }}>
            <h2 className="text-sm font-black uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: trialExpired ? "#991B1B" : "var(--color-brown-900)" }}>
              <Clock size={16} style={{ color: trialExpired ? "#DC2626" : "var(--color-orange-500)" }} /> Trial Status
            </h2>
            {restaurant.trialEndsAt ? (
              <p className="text-sm font-semibold" style={{ color: trialExpired ? "#991B1B" : "var(--color-text-secondary)" }}>
                {trialExpired
                  ? `Your free trial ended on ${new Date(restaurant.trialEndsAt).toLocaleDateString("en-IN")}. Choose a plan to keep going without interruption.`
                  : `${trialDays} day${trialDays === 1 ? "" : "s"} remaining — trial ends ${new Date(restaurant.trialEndsAt).toLocaleDateString("en-IN")}.`}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No trial end date on record.</p>
            )}
          </motion.section>
        )}

        {/* Restaurant Information */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide mb-1 flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Store size={16} style={{ color: "var(--color-orange-500)" }} /> Restaurant Information
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoRow label="Name" value={restaurant.name} />
            <InfoRow label="Slug" value={restaurant.slug} />
            <InfoRow label="Cuisine" value={restaurant.cuisine || "—"} />
            <InfoRow label="Created" value={new Date(restaurant.createdAt).toLocaleDateString("en-IN")} />
          </div>
        </motion.section>

        {/* Billing Email */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide mb-1 flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Mail size={16} style={{ color: "var(--color-orange-500)" }} /> Billing Email
          </h2>
          <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
            Where future invoices/receipts would be sent — no payment processing is active yet.
          </p>
          <div className="flex gap-2">
            <input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} className="input flex-1" placeholder="billing@yourrestaurant.com" />
            <button onClick={handleSaveBillingEmail} disabled={saving} className="btn-secondary px-4 text-xs font-bold uppercase tracking-wider">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </motion.section>

        {/* Available Plans */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-sm font-black uppercase tracking-wide mb-3" style={{ color: "var(--color-brown-900)" }}>Available Plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PLANS.map((plan) => (
              <div key={plan.key} className="rounded-xl p-4 border" style={{ borderColor: planDisplay.key === plan.key ? "var(--color-orange-500)" : "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
                <p className="text-xs font-black uppercase tracking-wide mb-1" style={{ color: "var(--color-brown-900)" }}>{plan.name}</p>
                <p className="text-lg font-black mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-600)" }}>{plan.priceLabel}</p>
                <ul className="space-y-1">
                  {plan.features.slice(0, 3).map((f) => (
                    <li key={f} className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>• {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="p-2.5 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p className="text-xs font-bold" style={{ color: "var(--color-brown-900)" }}>{value}</p>
    </div>
  );
}
