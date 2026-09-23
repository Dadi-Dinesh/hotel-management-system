import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { PLATFORM_NAME } from "../lib/branding";

export const metadata = {
  title: "Terms of Service",
  description: `The terms governing use of ${PLATFORM_NAME} by restaurants and their staff.`,
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By creating a restaurant account or using ${PLATFORM_NAME}'s demo, you agree to these Terms of Service. This is a template provided as part of the product — replace it with a legally reviewed version before any real commercial use.`,
  },
  {
    title: "2. Free Trial",
    body: "New restaurants receive a 14-day free trial with no credit card required. Continued use after the trial period is subject to selecting a plan once billing is introduced.",
  },
  {
    title: "3. Account Responsibilities",
    body: "Restaurant admins are responsible for the accuracy of menu, pricing, and branding information they publish, and for managing staff access (invites, roles) within their own restaurant.",
  },
  {
    title: "4. Acceptable Use",
    body: "The platform may not be used to publish unlawful content, impersonate another business, or attempt to access another restaurant's data.",
  },
  {
    title: "5. Service Availability",
    body: "We aim for high availability but do not guarantee uninterrupted service. The platform includes offline support so core ordering functionality can continue through brief connectivity interruptions.",
  },
  {
    title: "6. Termination",
    body: "A restaurant admin may disable their restaurant at any time from Settings → Danger Zone. Disabling hides the restaurant from customers but never deletes historical data.",
  },
  {
    title: "7. Contact",
    body: "Questions about these terms can be sent via the Contact page.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface)" }}>
      <MarketingNav />
      <main className="flex-1 px-6 py-16 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
          Terms of Service
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
