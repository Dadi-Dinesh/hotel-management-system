"use client";

import Link from "next/link";
import { PLATFORM_NAME, PLATFORM_TAGLINE, DEMO_BADGE_TEXT } from "../../lib/branding";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/demo", label: "Demo" },
      { href: "/apply", label: "Register Restaurant" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
  {
    title: "Portals",
    links: [
      { href: "/admin/login", label: "Restaurant Login" },
      { href: "/captain/login", label: "Staff Login" },
      { href: "/kitchen/login", label: "Kitchen KDS" },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer style={{ background: "var(--ss-primary)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-8 mb-12">
          <div className="col-span-2 sm:col-span-2">
            <p
              className="font-bold text-lg mb-2"
              style={{ fontFamily: "var(--font-heading)", color: "var(--ss-accent)" }}
            >
              {PLATFORM_NAME}
            </p>
            <p className="ss-small leading-relaxed" style={{ color: "rgba(255,253,248,0.6)" }}>
              {PLATFORM_TAGLINE}
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="sm:col-span-1">
              <p className="ss-caption font-bold mb-3" style={{ color: "rgba(255,253,248,0.4)" }}>
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="ss-small font-medium hover:opacity-100 transition-opacity"
                      style={{ color: "rgba(255,253,248,0.75)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderColor: "rgba(255,253,248,0.12)" }}
        >
          <p className="ss-caption" style={{ color: "rgba(255,253,248,0.55)" }}>
            &copy; {new Date().getFullYear()} {PLATFORM_NAME} — {PLATFORM_TAGLINE}
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full ss-caption font-semibold transition-colors"
            style={{ background: "rgba(232, 144, 23, 0.14)", border: "1px solid rgba(232, 144, 23, 0.3)", color: "var(--ss-accent)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--ss-success)" }} />
            {DEMO_BADGE_TEXT}
          </Link>
        </div>
      </div>
    </footer>
  );
}
