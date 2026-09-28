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
      { href: "/apply", label: "Apply for Your Restaurant" },
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
      { href: "/restaurant/login", label: "Restaurant Login" },
      { href: "/admin/login", label: "Platform Admin" },
      { href: "/captain/login", label: "Staff Login" },
      { href: "/kitchen/login", label: "Kitchen KDS" },
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
        <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: "rgba(255,253,247,0.12)" }}>
          <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,253,247,0.55)" }}>
            © 2026 ServeSync — Smart QR Restaurant Management Platform
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all hover:bg-amber-400/20"
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#FBBF24",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Demo • Sree Nookambika Family Dhaba
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
