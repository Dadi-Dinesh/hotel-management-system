"use client";

import Link from "next/link";
import { Receipt, Wifi, ListChecks, History, FlaskConical, Zap } from "lucide-react";

const NAV_TABS = [
  { href: "/admin/printer", label: "Hardware Agent", icon: Zap },
  { href: "/admin/printer/settings", label: "Print Settings", icon: Receipt },
  { href: "/admin/printer/discovery", label: "Discovery", icon: Wifi },
  { href: "/admin/printer/queue", label: "Queue", icon: ListChecks },
  { href: "/admin/printer/history", label: "History", icon: History },
  { href: "/admin/printer/test", label: "Test Print", icon: FlaskConical },
];

/** Shared sub-navigation strip across every Universal Print Engine admin page. */
export default function PrinterNav({ active }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {NAV_TABS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full ss-caption font-bold whitespace-nowrap transition-all shrink-0"
          style={{
            background: active === href ? "var(--ss-primary)" : "var(--ss-surface)",
            color: active === href ? "var(--ss-on-accent)" : "var(--ss-secondary)",
            border: `1px solid ${active === href ? "var(--ss-primary)" : "var(--ss-border)"}`,
          }}
        >
          <Icon size={13} /> {label}
        </Link>
      ))}
    </div>
  );
}
