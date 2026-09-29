"use client";

import RestaurantSwitcher from "../RestaurantSwitcher";
import { useSocket } from "../SocketProvider";

/**
 * Compact per-page header for the admin dashboard shell — sits to the
 * right of the persistent Sidebar. Replaces the old shared `Navbar` for
 * /admin/* pages only (Navbar itself is untouched — kitchen/captain/
 * platform pages still use it as before).
 */
export default function DashboardHeader({ title, subtitle = null, actions = null }) {
  const { isConnected } = useSocket();

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md border-b"
      style={{ background: "rgba(255, 253, 248, 0.9)", borderColor: "var(--ss-border)" }}
    >
      <div className="h-16 pl-14 lg:pl-5 pr-4 sm:pr-5 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold truncate" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="ss-caption font-semibold truncate" style={{ color: "var(--ss-secondary)" }}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          <RestaurantSwitcher />
          <span
            className="hidden sm:inline-flex items-center gap-1.5 ss-caption font-bold px-2.5 py-1.5 rounded-full"
            style={{
              background: isConnected ? "rgba(27,138,90,0.1)" : "rgba(214,69,69,0.1)",
              color: isConnected ? "var(--ss-success)" : "var(--ss-danger)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: isConnected ? "var(--ss-success)" : "var(--ss-danger)" }} />
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
