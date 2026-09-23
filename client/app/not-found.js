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
      style={{ background: "var(--color-cream-50, #FFFDF7)" }}
    >
      <div className="max-w-sm w-full text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{
            background: "linear-gradient(135deg, var(--color-cream-200), var(--color-cream-100))",
            border: "1px solid var(--color-border-light)",
          }}
        >
          <Compass size={28} style={{ color: "var(--color-orange-500, #E8891C)" }} />
        </div>
        <p
          className="font-bold text-base uppercase tracking-widest mb-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900, #3D2710)" }}
        >
          Page not found
        </p>
        <p
          className="text-xs max-w-xs mx-auto leading-relaxed mb-6"
          style={{ color: "var(--color-text-muted, #8A7B6C)" }}
        >
          This page doesn&apos;t exist on {PLATFORM_NAME}, or the link may be out of date. If you scanned a table QR code, try scanning it again.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90"
          style={{ background: "var(--color-orange-500, #E8891C)", color: "#fff", borderRadius: "2px" }}
        >
          <Home size={14} /> Go Home
        </Link>
      </div>
    </div>
  );
}
