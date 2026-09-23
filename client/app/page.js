import HomePageClient from "./HomePageClient";
import { PLATFORM_NAME, PLATFORM_TAGLINE, DEMO_RESTAURANT } from "./lib/branding";

export const metadata = {
  title: { absolute: `${PLATFORM_NAME} — Run Your Restaurant Smarter` },
  description: `${PLATFORM_NAME} is a QR ordering, kitchen display, and restaurant management platform — QR ordering, real-time kitchen, smart billing, and AI insights in one place. Try the live demo or start a free trial.`,
  keywords: "ServeSync, QR ordering, restaurant management software, restaurant POS, kitchen display system, restaurant SaaS, AI restaurant insights",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: `${PLATFORM_NAME} — ${PLATFORM_TAGLINE}`,
    description: `QR Ordering • Real-Time Kitchen • Smart Billing • AI Insights — everything a restaurant needs, in one platform.`,
    siteName: PLATFORM_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${PLATFORM_NAME} — ${PLATFORM_TAGLINE}`,
    description: `QR Ordering • Real-Time Kitchen • Smart Billing • AI Insights — everything a restaurant needs, in one platform.`,
  },
};

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: PLATFORM_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: PLATFORM_TAGLINE,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR", description: "14-day free trial" },
    provider: { "@type": "Organization", name: PLATFORM_NAME },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <HomePageClient />
      {/* Demo restaurant name kept in server-rendered markup for discoverability */}
      <span className="sr-only">Live demo restaurant: {DEMO_RESTAURANT.name}</span>
    </>
  );
}
