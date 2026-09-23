import PricingPageClient from "./PricingPageClient";
import { PLATFORM_NAME } from "../lib/branding";

export const metadata = {
  title: "Pricing",
  description: `${PLATFORM_NAME} pricing — Starter, Growth, and Enterprise plans for restaurants of every size. Start with a free 14-day trial, no credit card required.`,
  alternates: { canonical: "/pricing" },
  openGraph: { title: `${PLATFORM_NAME} Pricing`, description: "Simple, honest pricing — start free, upgrade when you're ready." },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
