"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { PLATFORM_NAME } from "../lib/branding";

export default function OnboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the new verified registration application
    const timer = setTimeout(() => {
      router.replace("/apply");
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-surface, #FFFDF7)" }}>
      <div className="max-w-md w-full bg-white rounded-3xl border p-8 text-center shadow-sm" style={{ borderColor: "var(--color-border-light)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--color-cream-100)", color: "var(--color-orange-500)" }}>
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-xl font-black uppercase tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
          {PLATFORM_NAME} Registration
        </h1>
        <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
          Instant onboarding has been replaced with our verified restaurant registration workflow. Redirecting you to the registration portal...
        </p>

        <div className="flex items-center justify-center gap-2 mb-6 text-xs text-orange-600 font-bold">
          <Loader2 size={16} className="animate-spin" />
          <span>Taking you to restaurant registration...</span>
        </div>

        <Link
          href="/apply"
          className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
        >
          Go to Registration Form <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
