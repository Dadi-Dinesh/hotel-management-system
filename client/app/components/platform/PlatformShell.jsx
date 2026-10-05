"use client";

/**
 * Chrome for the ServeSync Admin portal (/platform/*): platform-only nav,
 * header and notification bell. Deliberately shares nothing with the
 * Restaurant Admin sidebar — no menu, tables, orders, kitchen or reviews.
 *
 * Realtime: joins the authenticated `platform:admins` socket room and, on
 * any application event, refreshes the persisted activity feed and fires a
 * `servesync:platform-refresh` window event that open pages listen to.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, FileText, LayoutDashboard, LogOut, Menu, Settings, Store, X, Activity } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { clearAuth, getToken, getUser } from "../../lib/auth";
import { connectSocket } from "../../lib/socket";
import { PLATFORM_NAME } from "../../lib/branding";
import { timeAgo } from "./PlatformUI";

export const PLATFORM_REFRESH_EVENT = "servesync:platform-refresh";
const SEEN_KEY = "servesync-platform-notifications-seen";

const NAV = [
  { href: "/platform", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/platform/applications", label: "Applications", icon: FileText },
  { href: "/platform/restaurants", label: "Restaurants / Clients", icon: Store },
  { href: "/platform/notifications", label: "Notifications", icon: Activity },
  { href: "/platform/settings", label: "Settings", icon: Settings },
];

function readSeen() {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeSeen(ts) {
  try {
    localStorage.setItem(SEEN_KEY, String(ts));
  } catch {
    // Storage unavailable — unread badge just won't persist across reloads.
  }
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "var(--ss-primary)", color: "var(--ss-accent)" }}>
        S
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[15px] font-bold truncate" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
          {PLATFORM_NAME}
        </p>
        <p className="text-[11px] font-medium truncate" style={{ color: "var(--ss-secondary)" }}>
          Platform Administration
        </p>
      </div>
    </div>
  );
}

function NavList({ pathname, onNavigate, pendingCount }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3 space-y-0.5" aria-label="Platform navigation">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className="flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: active ? "var(--ss-accent-tint)" : "transparent",
              color: active ? "var(--ss-accent-dark)" : "var(--ss-secondary)",
            }}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className="truncate flex-1">{label}</span>
            {href === "/platform/applications" && pendingCount > 0 && (
              <span className="text-[11px] font-bold px-1.5 min-w-[20px] text-center rounded-full" style={{ background: "var(--ss-accent)", color: "var(--ss-primary)" }}>
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function NotificationBell({ items, unread, onOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          onOpen();
        }}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)" }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: "var(--ss-danger)", color: "#fff" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl overflow-hidden z-50"
          style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", boxShadow: "var(--ss-shadow-lg)" }}
        >
          <div className="px-4 py-3 border-b text-xs font-bold uppercase tracking-wide" style={{ borderColor: "var(--ss-border)", color: "var(--ss-primary)" }}>
            Notifications
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm" style={{ color: "var(--ss-secondary)" }}>
                No platform activity yet.
              </li>
            ) : (
              items.slice(0, 8).map((n) => (
                <li key={n.id} className="border-b last:border-b-0" style={{ borderColor: "var(--ss-border)" }}>
                  <Link
                    href={n.applicationId ? `/platform/applications/${n.applicationId}` : n.restaurantId ? `/platform/restaurants/${n.restaurantId}` : "/platform/notifications"}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-[var(--ss-bg)]"
                  >
                    <p className="text-sm" style={{ color: "var(--ss-primary)" }}>
                      {n.message}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ss-secondary)" }}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/platform/notifications"
            onClick={() => setOpen(false)}
            className="block text-center px-4 py-2.5 text-xs font-bold border-t"
            style={{ borderColor: "var(--ss-border)", color: "var(--ss-accent-dark)" }}
          >
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}

export default function PlatformShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activity, setActivity] = useState([]);
  const [seenAt, setSeenAt] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [user, setUser] = useState(null);

  const loadActivity = useCallback(async () => {
    try {
      const [act, stats] = await Promise.all([api.get("/platform/activity", { params: { limit: 20 } }), api.get("/platform/stats")]);
      setActivity(act.data.data || []);
      setPendingCount(stats.data.data?.pendingApplications || 0);
    } catch {
      // The bell is secondary chrome — individual pages surface their own errors.
    }
  }, []);

  useEffect(() => {
    setUser(getUser());
    setSeenAt(readSeen());
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const socket = connectSocket();
    const join = () => socket.emit("join-platform", { token: getToken() });
    join();
    socket.on("connect", join);

    const onEvent = (type) => (payload) => {
      if (type === "new") toast.success(`New application: ${payload?.restaurantName || "a restaurant"}`);
      loadActivity();
      window.dispatchEvent(new CustomEvent(PLATFORM_REFRESH_EVENT, { detail: { type, payload } }));
    };
    const handlers = {
      "application:new": onEvent("new"),
      "application:approved": onEvent("approved"),
      "application:rejected": onEvent("rejected"),
    };
    Object.entries(handlers).forEach(([e, h]) => socket.on(e, h));
    // Local actions (approve/reject on this tab) ask the chrome to refresh too.
    const onLocal = () => loadActivity();
    window.addEventListener(PLATFORM_REFRESH_EVENT, onLocal);

    return () => {
      socket.off("connect", join);
      Object.entries(handlers).forEach(([e, h]) => socket.off(e, h));
      window.removeEventListener(PLATFORM_REFRESH_EVENT, onLocal);
    };
  }, [loadActivity]);

  useEffect(() => setDrawerOpen(false), [pathname]);

  const unread = activity.filter((a) => new Date(a.createdAt).getTime() > seenAt).length;
  const markSeen = () => {
    const now = Date.now();
    setSeenAt(now);
    writeSeen(now);
  };

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  const footer = (
    <div className="p-3 border-t flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
      {user && (
        <div className="px-3 pb-2 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--ss-primary)" }}>
            {user.name}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--ss-secondary)" }}>
            {user.email}
          </p>
        </div>
      )}
      <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold" style={{ color: "var(--ss-danger)" }}>
        <LogOut size={18} /> Log out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "var(--ss-bg)" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 border-r" style={{ background: "var(--ss-surface)", borderColor: "var(--ss-border)" }}>
        <div className="h-16 px-5 flex items-center border-b flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
          <Brand />
        </div>
        <NavList pathname={pathname} pendingCount={pendingCount} />
        {footer}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0" style={{ background: "rgba(59,34,10,0.45)" }} onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col" style={{ background: "var(--ss-surface)", boxShadow: "var(--ss-shadow-lg)" }}>
            <div className="h-16 px-4 flex items-center justify-between border-b flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
              <Brand />
              <button onClick={() => setDrawerOpen(false)} aria-label="Close navigation" className="w-9 h-9 flex items-center justify-center" style={{ color: "var(--ss-primary)" }}>
                <X size={20} />
              </button>
            </div>
            <NavList pathname={pathname} pendingCount={pendingCount} onNavigate={() => setDrawerOpen(false)} />
            {footer}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="h-16 sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 border-b"
          style={{ background: "rgba(247,244,237,0.92)", backdropFilter: "blur(8px)", borderColor: "var(--ss-border)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)" }}
            >
              <Menu size={18} />
            </button>
            <div className="lg:hidden min-w-0">
              <Brand />
            </div>
            <p className="hidden lg:block text-sm font-semibold" style={{ color: "var(--ss-secondary)" }}>
              ServeSync Admin
            </p>
          </div>
          <NotificationBell items={activity} unread={unread} onOpen={markSeen} />
        </header>
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
