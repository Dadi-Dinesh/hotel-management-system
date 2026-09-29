"use client";

/**
 * Cart totals block: subtotal → note → grand total.
 *
 * Note: this system does not expose restaurant tax/service-charge rates to
 * the customer-facing API by design (only the admin-authenticated settings
 * endpoint carries them), so this intentionally never invents a tax figure.
 * Subtotal and total are the same real number; the note is honest about that.
 */
export default function CartSummary({ subtotal, label = "Subtotal" }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="ss-small font-semibold" style={{ color: "var(--ss-secondary)" }}>
          {label}
        </span>
        <span className="ss-body font-semibold" style={{ color: "var(--ss-primary)" }}>
          ₹{subtotal}
        </span>
      </div>
      <p className="ss-caption" style={{ color: "var(--ss-secondary)" }}>
        Taxes &amp; charges, if applicable, are included on your final bill.
      </p>
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--ss-border)" }}>
        <span className="text-sm font-bold" style={{ color: "var(--ss-primary)" }}>
          Total
        </span>
        <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-accent-dark)" }}>
          ₹{subtotal}
        </span>
      </div>
    </div>
  );
}
