"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Menu, X, ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { ADMIN_NAV_ITEMS } from "./adminNavConfig";
import { useRestaurant } from "../RestaurantContext";
import { clearAuth } from "../../lib/auth";
import { PLATFORM_NAME } from "../../lib/branding";

const COLLAPSE_KEY = "servesync-admin-sidebar-collapsed";

/** Nav link list — module-scope component (not defined inside Sidebar's
 * render) so it isn't recreated, and therefore reset, on every render. */
function NavLinks({ pathname, collapsed, onNavigate }) {
  const showLabel = !collapsed || Boolean(onNavigate);
  return (
    <nav className="flex-1 overflow-y-auto py-2 space-y-0.5" aria-label="Admin navigation">
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className="ss-link-hover flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: active ? "var(--ss-accent-tint)" : "transparent",
              color: active ? "var(--ss-accent-dark)" : "var(--ss-secondary)",
            }}
            title={collapsed ? item.label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {showLabel && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Persistent left navigation for the /admin/* suite. Desktop: fixed,
 * collapsible column. Mobile: hidden behind a hamburger, opens as an
 * overlay drawer. Owns logout + the platform-owner-only nav so individual
 * pages no longer each re-render their own copy.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { restaurant } = useRestaurant();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // The login page renders inside this same layout (Next.js layouts wrap
  // every nested route) but shouldn't show authenticated nav chrome.
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/admin/login");
  };

  if (isLoginPage) return null;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="lg:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", boxShadow: "var(--ss-shadow-sm)" }}
      >
        <Menu size={18} />
      </button>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 border-r transition-[width] duration-200"
        style={{ width: collapsed ? 76 : 248, background: "var(--ss-surface)", borderColor: "var(--ss-border)" }}
      >
        <div className="flex items-center gap-2.5 px-4 h-16 border-b flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: "var(--ss-primary)", color: "var(--ss-accent)" }}
          >
            S
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
                {PLATFORM_NAME}
              </p>
              <p className="ss-caption truncate">{restaurant?.name ? `${restaurant.name} Management` : "Restaurant Admin"}</p>
            </div>
          )}
        </div>

        <NavLinks pathname={pathname} collapsed={collapsed} />

        <div className="p-2 border-t space-y-0.5 flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
          <button
            onClick={toggleCollapsed}
            className="ss-link-hover w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"
            style={{ color: "var(--ss-secondary)" }}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            {!collapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="ss-link-hover w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"
            style={{ color: "var(--ss-danger)" }}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40"
              style={{ background: "rgba(59, 34, 10, 0.5)" }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={shouldReduceMotion ? { opacity: 0 } : { x: "-100%" }}
              animate={{ x: 0, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col"
              style={{ background: "var(--ss-surface)", boxShadow: "var(--ss-shadow-lg)" }}
            >
              <div className="flex items-center justify-between px-4 h-16 border-b flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "var(--ss-primary)", color: "var(--ss-accent)" }}>
                    S
                  </span>
                  <p className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
                    {PLATFORM_NAME}
                  </p>
                </div>
                <button onClick={() => setMobileOpen(false)} aria-label="Close navigation" style={{ color: "var(--ss-primary)" }}>
                  <X size={20} />
                </button>
              </div>
              <NavLinks pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
              <div className="p-2 border-t flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ color: "var(--ss-danger)" }}
                >
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
