"use client";

import Link from "next/link";
import { PLATFORM_NAME, PLATFORM_TAGLINE, DEMO_RESTAURANT } from "../../lib/branding";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/demo", label: "Demo" },
      { href: "/onboard", label: "Start Free Trial" },
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
      { href: "/admin/login", label: "Admin Login" },
      { href: "/captain/login", label: "Captain Login" },
      { href: "/kitchen/login", label: "Kitchen Login" },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--color-border-light)", background: "var(--color-brown-900)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-black text-lg uppercase tracking-widest mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-500)" }}>
              {PLATFORM_NAME}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,253,247,0.6)" }}>{PLATFORM_TAGLINE}</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,253,247,0.4)" }}>{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs font-semibold hover:opacity-100 transition-opacity" style={{ color: "rgba(255,253,247,0.75)" }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderColor: "rgba(255,253,247,0.12)" }}>
          <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(255,253,247,0.45)" }}>
            © {new Date().getFullYear()} {PLATFORM_NAME} · Demo powered by {DEMO_RESTAURANT.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
