import FeaturesPageClient from "./FeaturesPageClient";
import { PLATFORM_NAME } from "../lib/branding";

export const metadata = {
  title: "Features",
  description: `Explore every ${PLATFORM_NAME} feature — QR ordering, live order tracking, waiter dashboard, kitchen display, universal printing, admin analytics, AI Copilot, and multi-tenant SaaS.`,
  alternates: { canonical: "/features" },
  openGraph: { title: `${PLATFORM_NAME} Features`, description: "Customer experience, operations, and management tools — all in one restaurant platform." },
};

export default function FeaturesPage() {
  return <FeaturesPageClient />;
}
