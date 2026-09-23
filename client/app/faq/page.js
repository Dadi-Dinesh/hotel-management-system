import FAQPageClient from "./FAQPageClient";
import { PLATFORM_NAME } from "../lib/branding";

export const metadata = {
  title: "FAQ",
  description: `Answers to common questions about ${PLATFORM_NAME} — QR ordering, printing, offline support, multi-restaurant management, and pricing.`,
  alternates: { canonical: "/faq" },
};

const FAQ_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "How does QR ordering work?", acceptedAnswer: { "@type": "Answer", text: "Each table gets a unique QR code. Guests scan it, browse the menu, and order directly from their phone." } },
    { "@type": "Question", name: "Can I use my own printer?", acceptedAnswer: { "@type": "Answer", text: "Yes — thermal, network, Bluetooth, or plain browser/PDF printing are all supported." } },
    { "@type": "Question", name: "Does it work offline?", acceptedAnswer: { "@type": "Answer", text: "Yes — ServeSync is a Progressive Web App that queues actions taken offline and syncs automatically when connectivity returns." } },
    { "@type": "Question", name: "Can I manage multiple restaurants?", acceptedAnswer: { "@type": "Answer", text: "Yes — ServeSync is multi-tenant, with each restaurant's data fully isolated." } },
    { "@type": "Question", name: "Is there a free plan?", acceptedAnswer: { "@type": "Answer", text: "Every new restaurant starts with a 14-day free trial, no credit card required." } },
  ],
};

export default function FAQPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_STRUCTURED_DATA) }} />
      <FAQPageClient />
    </>
  );
}
