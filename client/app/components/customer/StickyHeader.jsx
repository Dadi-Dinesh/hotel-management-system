"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Search, ShoppingBag } from "lucide-react";

/**
 * Compact sticky header for the customer ordering flow (menu + orders
 * screens). Deliberately separate from the shared `Navbar` used by
 * admin/captain/platform dashboards — restyling this never touches staff UI.
 */
export default function StickyHeader({
  title,
  tableCode,
  logoSrc,
  backHref,
  onSearchClick,
  cartCount = 0,
  cartLabel,
  onCartClick,
  cartBumpKey,
}) {
  const hasCartContent = cartCount > 0 || Boolean(cartLabel);

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md border-b"
      style={{ borderColor: "var(--ss-border)", background: "rgba(255, 253, 248, 0.9)" }}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center gap-2 sm:gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Go back"
            className="ss-link-hover w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ color: "var(--ss-primary)" }}
          >
            <ArrowLeft size={18} />
          </Link>
        )}

        {logoSrc && (
          <div
            className="relative w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded-full overflow-hidden border"
            style={{ borderColor: "var(--ss-border)" }}
          >
            <Image src={logoSrc} alt={`${title} logo`} fill sizes="36px" className="object-cover" priority />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-base font-bold truncate" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
            {title}
          </h1>
          {tableCode && (
            <p className="ss-caption font-semibold truncate" style={{ color: "var(--ss-secondary)" }}>
              Table {tableCode}
            </p>
          )}
        </div>

        {onSearchClick && (
          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Search menu"
            className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-colors"
            style={{ background: "var(--ss-bg)", color: "var(--ss-primary)" }}
          >
            <Search size={17} />
          </button>
        )}

        {onCartClick && (
          <button
            type="button"
            onClick={onCartClick}
            aria-label={hasCartContent ? `Open cart, ${cartLabel || `${cartCount} items`}` : "Open cart"}
            className="ss-btn relative flex items-center gap-1.5 px-3 h-9 rounded-full flex-shrink-0"
            data-variant={hasCartContent ? "primary" : "secondary"}
            style={{
              background: hasCartContent ? "var(--ss-accent)" : "var(--ss-bg)",
              color: hasCartContent ? "var(--ss-on-accent)" : "var(--ss-primary)",
              border: hasCartContent ? "none" : "1px solid var(--ss-border)",
            }}
          >
            <span key={cartBumpKey} className="inline-flex ss-cart-bounce">
              <ShoppingBag size={16} />
            </span>
            {hasCartContent && <span className="text-xs font-bold whitespace-nowrap">{cartLabel}</span>}
          </button>
        )}
      </div>
    </header>
  );
}
