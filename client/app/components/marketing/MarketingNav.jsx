"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { PLATFORM_NAME } from "../../lib/branding";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

/** Public marketing site navigation — distinct from the in-app Navbar
 * (which shows restaurant branding for logged-in staff); this one is for
 * prospective visitors and always carries the ServeSync platform identity. */
export default function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ borderColor: "var(--color-border-light)", background: "rgba(255, 253, 247, 0.85)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black text-lg uppercase tracking-widest" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: "var(--color-brown-900)", color: "var(--color-orange-500)" }}
          >
            S
          </span>
          {PLATFORM_NAME}
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
              style={{
                color: pathname === link.href ? "var(--color-orange-600)" : "var(--color-text-secondary)",
                background: pathname === link.href ? "var(--color-cream-100)" : "transparent",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/admin/login" className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-brown-900)" }}>
            Login
          </Link>
          <Link href="/onboard" className="btn-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider">
            Start Free Trial
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg"
          style={{ color: "var(--color-brown-900)" }}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t"
            style={{ borderColor: "var(--color-border-light)" }}
            aria-label="Mobile"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-brown-900)" }}>
                  {link.label}
                </Link>
              ))}
              <Link href="/admin/login" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-brown-900)" }}>
                Login
              </Link>
              <Link href="/onboard" onClick={() => setOpen(false)} className="btn-primary mt-2 py-3 text-xs font-bold uppercase tracking-wider text-center">
                Start Free Trial
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
