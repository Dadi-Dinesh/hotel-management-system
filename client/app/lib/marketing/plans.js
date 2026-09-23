/**
 * plans — the single source of truth for ServeSync's plan catalog. Used by
 * both the public Pricing page and the Admin Account page, so the two never
 * drift apart. Plan keys are chosen to be stable identifiers a future real
 * billing integration (Stripe or otherwise) could map price IDs onto —
 * nothing here talks to a payment provider yet (Phase 11 is UI + schema
 * only, per the brief).
 */
export const PLANS = [
  {
    key: "STARTER",
    name: "Starter",
    tagline: "Try ServeSync risk-free",
    price: 0,
    priceLabel: "Free",
    period: "14-day trial",
    highlight: false,
    features: ["Demo-friendly setup", "Up to 5 tables", "QR ordering & live kitchen", "Basic billing & printing", "Community support"],
  },
  {
    key: "GROWTH",
    name: "Growth",
    tagline: "For restaurants ready to scale",
    price: 1499,
    priceLabel: "₹1,499",
    period: "/month",
    highlight: true,
    features: ["Unlimited tables", "Full admin analytics", "Kitchen display system", "AI Copilot insights", "Universal print engine", "Priority email support"],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    tagline: "For multi-branch restaurant groups",
    price: null,
    priceLabel: "Custom",
    period: "contact us",
    highlight: false,
    features: ["Multi-branch management", "Custom branding", "Dedicated onboarding", "Priority support & SLA", "Everything in Growth"],
  },
];

export function getPlanByKey(key) {
  return PLANS.find((p) => p.key === key) || null;
}

/** Maps the restaurant record's current `plan` value (e.g. "FREE_TRIAL") to
 * a plan catalog entry for display — the DB default predates this catalog's
 * naming, so this keeps the Account page's copy human-readable either way. */
export function resolvePlanDisplay(planValue) {
  if (planValue === "FREE_TRIAL" || !planValue) return { name: "Free Trial", key: "STARTER" };
  const found = getPlanByKey(planValue);
  return found ? { name: found.name, key: found.key } : { name: planValue, key: null };
}
