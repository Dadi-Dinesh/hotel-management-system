"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { PLATFORM_NAME } from "../../lib/branding";
import Button from "../ui/Button";
import styles from "./marketing.module.css";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/demo", label: "Demo" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

export default function MarketingNav({ skipTo }) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const closeOutside = (event) => {
      if (!headerRef.current?.contains(event.target)) setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1200px)");
    const closeOnDesktop = (event) => {
      if (event.matches) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  return (
    <header ref={headerRef} className={styles.header}>
      {skipTo && (
        <a href={skipTo} className={styles.skipLink}>
          Skip to content
        </a>
      )}
      <div className={`${styles.container} ${styles.navBar}`}>
        <Link
          href="/"
          className={styles.brand}
          aria-label={`${PLATFORM_NAME} home`}
          onClick={() => setOpen(false)}
        >
          <span className={styles.brandMark} aria-hidden="true">
            S
          </span>
          {PLATFORM_NAME}
        </Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.desktopActions}>
          <Link href="/login" className={styles.loginLink}>
            Login
          </Link>
          <Button href="/apply" className={styles.navCta}>
            Register Restaurant
          </Button>
        </div>
        <button
          ref={toggleRef}
          type="button"
          className={styles.menuToggle}
          aria-expanded={open}
          aria-controls="marketing-mobile-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <X size={22} aria-hidden="true" />
          ) : (
            <Menu size={22} aria-hidden="true" />
          )}
        </button>
      </div>
      <nav
        id="marketing-mobile-navigation"
        hidden={!open}
        className={styles.mobileNav}
        aria-label="Mobile navigation"
      >
        <div className={styles.container}>
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Login
          </Link>
          <Button
            href="/apply"
            className={styles.mobileCta}
            onClick={() => setOpen(false)}
          >
            Register Restaurant
          </Button>
        </div>
      </nav>
    </header>
  );
}
