import Link from "next/link";
import { Store, Users, ChefHat, ArrowRight } from "lucide-react";
import { PLATFORM_NAME } from "../lib/branding";

export const metadata = {
  title: "Login | ServeSync",
  description: "Choose your workspace to sign in to ServeSync.",
};

// One entry per restaurant workspace. There is no public "Platform Admin"
// button: ServeSync Platform Admin credentials entered in any of these forms
// are recognised server-side (restaurantId null) and routed to /platform —
// see lib/auth.js getPostLoginRoute.
const WORKSPACES = [
  {
    href: "/admin/login",
    icon: Store,
    label: "Restaurant Admin",
    description: "Manage your restaurant.",
  },
  {
    href: "/captain/login",
    icon: Users,
    label: "Captain",
    description: "Manage tables and customer service.",
  },
  {
    href: "/kitchen/login",
    icon: ChefHat,
    label: "Kitchen",
    description: "Manage incoming orders.",
  },
];

export default function LoginSelectionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: "var(--ss-bg)" }}>
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-5"
            style={{ background: "var(--ss-primary)", color: "var(--ss-accent)" }}
          >
            S
          </span>
          <p className="ss-caption font-bold mb-2" style={{ color: "var(--ss-accent-dark)" }}>
            {PLATFORM_NAME}
          </p>
          <h1 className="ss-h1 mb-2">Choose how you want to sign in</h1>
          <p className="ss-body" style={{ color: "var(--ss-secondary)" }}>
            Pick your workspace — each one only shows your own restaurant.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {WORKSPACES.map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="ss-link-hover group flex flex-col gap-3 p-6 rounded-[var(--ss-radius-card)] text-left transition-transform"
              style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", boxShadow: "var(--ss-shadow-sm)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}
              >
                <Icon size={22} />
              </div>
              <div className="flex-1">
                <h2 className="ss-h3 mb-1" style={{ color: "var(--ss-primary)" }}>
                  {label}
                </h2>
                <p className="ss-small" style={{ color: "var(--ss-secondary)" }}>
                  {description}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 ss-small font-bold" style={{ color: "var(--ss-accent-dark)" }}>
                Sign in <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>

        <p className="text-center ss-small mt-8" style={{ color: "var(--ss-secondary)" }}>
          New to {PLATFORM_NAME}?{" "}
          <Link href="/apply" className="font-bold underline" style={{ color: "var(--ss-accent-dark)" }}>
            Register your restaurant
          </Link>
        </p>
      </div>
    </div>
  );
}
