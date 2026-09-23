import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { PLATFORM_NAME } from "../lib/branding";

export const metadata = {
  title: "Privacy Policy",
  description: `How ${PLATFORM_NAME} collects, uses, and protects data for restaurants and their customers.`,
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    title: "1. Overview",
    body: `This Privacy Policy explains how ${PLATFORM_NAME} ("we", "our", "the platform") handles information when a restaurant and its customers use our QR ordering, kitchen, billing, and analytics tools. This is a template policy provided as part of the product — replace it with a legally reviewed version before any real commercial use.`,
  },
  {
    title: "2. Information We Collect",
    body: "We collect restaurant account details (name, contact info, branding assets), staff account details, order and billing data placed through a table's QR code, and optional feedback/ratings customers choose to submit. We do not require customers to create an account to place an order.",
  },
  {
    title: "3. How We Use Information",
    body: "Order and billing data is used to operate the restaurant's own dashboard, kitchen display, and analytics — including the AI Copilot, which computes insights only from that restaurant's own historical data. We do not sell restaurant or customer data to third parties.",
  },
  {
    title: "4. Data Isolation",
    body: "ServeSync is multi-tenant: every restaurant's data is scoped at the database level and is not visible to other restaurants on the platform.",
  },
  {
    title: "5. Cookies & Local Storage",
    body: "The platform uses browser local storage to keep a customer's session and cart active during a visit, and to support offline order queuing. No third-party advertising cookies are used.",
  },
  {
    title: "6. Contact",
    body: "Questions about this policy can be sent via the Contact page.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface)" }}>
      <MarketingNav />
      <main className="flex-1 px-6 py-16 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
          Privacy Policy
        </h1>
        <p className="text-xs font-semibold mb-10" style={{ color: "var(--color-text-muted)" }}>Last updated {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-sm font-black uppercase tracking-wide mb-2" style={{ color: "var(--color-brown-900)" }}>{s.title}</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{s.body}</p>
            </section>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
