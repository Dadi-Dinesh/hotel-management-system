"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { PLATFORM_NAME } from "../../lib/branding";
import Button from "../ui/Button";

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
    <header
      className="sticky top-0 z-40 backdrop-blur-md border-b"
      style={{ borderColor: "var(--ss-border)", background: "rgba(255, 253, 248, 0.85)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-base"
          style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}
        >
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: "var(--ss-primary)", color: "var(--ss-accent)" }}
          >
            S
          </span>
          {PLATFORM_NAME}
        </Link>

        <nav className="hidden md:flex items-center justify-center gap-1" aria-label="Main">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="ss-link-hover px-3.5 py-2 rounded-full text-sm font-medium"
                style={{
                  color: active ? "var(--ss-accent-dark)" : "var(--ss-secondary)",
                  background: active ? "var(--ss-accent-tint)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = "var(--ss-primary)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = "var(--ss-secondary)";
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="ss-link-hover px-2 py-2 text-sm font-medium"
              style={{ color: "var(--ss-secondary)" }}
            >
              Login
            </Link>
            <Button href="/apply" size="md" icon={ArrowRight} iconPosition="right" className="!px-5 !py-2.5 text-sm">
              Register Restaurant
            </Button>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl"
            style={{ color: "var(--ss-primary)" }}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 top-16 z-30"
              style={{ background: "rgba(59, 34, 10, 0.25)" }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.nav
              key="drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="md:hidden fixed top-16 left-0 right-0 z-40 border-b"
              style={{ background: "var(--ss-surface)", borderColor: "var(--ss-border)", boxShadow: "var(--ss-shadow-md)" }}
              aria-label="Mobile"
            >
              <div className="px-4 py-4 flex flex-col gap-1">
                {LINKS.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className="px-4 py-3 rounded-xl text-sm font-semibold"
                      style={{
                        color: active ? "var(--ss-accent-dark)" : "var(--ss-primary)",
                        background: active ? "var(--ss-accent-tint)" : "transparent",
                      }}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-semibold"
                  style={{ color: "var(--ss-primary)" }}
                >
                  Login
                </Link>
                <Button href="/apply" size="md" fullWidthOnMobile className="mt-2 w-full" onClick={() => setOpen(false)}>
                  Register Restaurant
                </Button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
