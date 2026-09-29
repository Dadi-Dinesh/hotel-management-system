import Link from "next/link";
import { Home, Compass } from "lucide-react";
import { PLATFORM_NAME } from "./lib/branding";

export const metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: "var(--ss-bg, #F7F4ED)" }}
    >
      <div className="max-w-sm w-full text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--ss-accent-tint, rgba(232,144,23,0.12))" }}
        >
          <Compass size={32} style={{ color: "var(--ss-accent-dark, #5C3A12)" }} />
        </div>
        <h1 className="ss-h2 mb-2">Page not found</h1>
        <p className="ss-small mb-8 max-w-xs mx-auto">
          This page doesn&apos;t exist on {PLATFORM_NAME}, or the link may be out of date. If you scanned a table QR code, try scanning it again.
        </p>
        <Link
          href="/"
          className="ss-btn inline-flex items-center justify-center gap-2 px-6 py-3.5 ss-small font-semibold"
          data-variant="primary"
          style={{
            background: "var(--ss-accent, #E89017)",
            color: "var(--ss-on-accent, #fff)",
            borderRadius: "var(--ss-radius-button, 16px)",
            boxShadow: "var(--ss-shadow-md, 0 16px 40px -16px rgba(59,34,10,0.16))",
          }}
        >
          <Home size={16} /> Go Home
        </Link>
      </div>
    </div>
  );
}
