import HomePageClient from "./HomePageClient";
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "./lib/branding";

export const metadata = {
  title: { absolute: `${PLATFORM_NAME} | Smart QR Restaurant Management` },
  description: "ServeSync helps restaurants manage QR ordering, kitchen operations, billing, analytics, and printing.",
  keywords: "ServeSync, QR ordering, restaurant management software, restaurant POS, kitchen display system, restaurant SaaS, AI restaurant insights",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: `${PLATFORM_NAME} — ${PLATFORM_TAGLINE}`,
    description: "ServeSync helps restaurants manage QR ordering, kitchen operations, billing, analytics, and printing.",
    siteName: PLATFORM_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${PLATFORM_NAME} — ${PLATFORM_TAGLINE}`,
    description: "ServeSync helps restaurants manage QR ordering, kitchen operations, billing, analytics, and printing.",
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
    </>
  );
}
