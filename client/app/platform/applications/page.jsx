"use client";

/**
 * ServeSync Admin — restaurant applications. Status tabs with real counts,
 * search by restaurant / owner / email / phone. Table on desktop, cards on
 * mobile. Defaults to Pending.
 */
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, FileText, Search } from "lucide-react";
import api from "../../lib/api";
import { PLATFORM_REFRESH_EVENT } from "../../components/platform/PlatformShell";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge, errorMessage, formatDate } from "../../components/platform/PlatformUI";

const TABS = [
  { key: "", label: "All", countKey: "ALL" },
  { key: "PENDING", label: "Pending", countKey: "PENDING" },
  { key: "APPROVED", label: "Approved", countKey: "APPROVED" },
  { key: "REJECTED", label: "Rejected", countKey: "REJECTED" },
];

const EMPTY_COPY = {
  PENDING: { icon: CheckCircle2, title: "No Pending Applications", description: "You're all caught up. New restaurant applications will appear here." },
  APPROVED: { icon: FileText, title: "No approved applications", description: "Applications you approve will be listed here." },
  REJECTED: { icon: FileText, title: "No rejected applications", description: "Applications you reject stay on record here." },
  "": { icon: FileText, title: "No applications yet", description: "Restaurant registrations from the ServeSync website will appear here." },
};

function ApplicationsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "PENDING";

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/platform/applications", { params: { status: status || undefined, q: debounced || undefined } });
      setApplications(res.data.data || []);
      setCounts(res.data.counts || null);
    } catch (err) {
      setError(errorMessage(err, "Please check your connection and try again."));
    } finally {
      setLoading(false);
    }
  }, [status, debounced]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    window.addEventListener(PLATFORM_REFRESH_EVENT, load);
    return () => window.removeEventListener(PLATFORM_REFRESH_EVENT, load);
  }, [load]);

  const selectTab = (key) => router.replace(`${pathname}?status=${key}`, { scroll: false });
  const empty = debounced
    ? { icon: Search, title: "No matching applications", description: `Nothing matches "${debounced}" in this view.` }
    : EMPTY_COPY[status] || EMPTY_COPY[""];

  return (
    <>
      <PageHeader title="Applications" description="Review restaurant registration requests and approve or reject them." />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" role="tablist" style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)" }}>
          {TABS.map((t) => {
            const active = status === t.key;
            return (
              <button
                key={t.key || "all"}
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(t.key)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap"
                style={{ background: active ? "var(--ss-primary)" : "transparent", color: active ? "#FFFDF8" : "var(--ss-secondary)" }}
              >
                {t.label}
                {counts && <span className="ml-1 tabular-nums opacity-80">({counts[t.countKey] ?? 0})</span>}
              </button>
            );
          })}
        </div>
        <div className="relative md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ss-secondary)" }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, owner, email or phone"
            aria-label="Search applications"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
            style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", "--tw-ring-color": "var(--ss-focus-ring)" }}
          />
        </div>
      </div>

      <Panel bodyClassName="">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : applications.length === 0 ? (
          <EmptyState {...empty} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--ss-secondary)" }}>
                    {["Restaurant", "Owner", "Contact", "Location", "Tables", "Submitted", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold border-b" style={{ borderColor: "var(--ss-border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.map((a) => (
                    <tr key={a.id} className="border-b last:border-b-0 align-top" style={{ borderColor: "var(--ss-border)" }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--ss-primary)" }}>
                        {a.restaurantName}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--ss-primary)" }}>
                        {a.ownerName}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--ss-secondary)" }}>
                        <div>{a.phone}</div>
                        <div className="break-all">{a.email}</div>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--ss-secondary)" }}>
                        {a.city}, {a.state}
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "var(--ss-primary)" }}>
                        {a.tableCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--ss-secondary)" }}>
                        {formatDate(a.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/platform/applications/${a.id}`}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                          style={{ border: "1px solid var(--ss-border)", color: "var(--ss-primary)" }}
                        >
                          View details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet cards */}
            <ul className="lg:hidden">
              {applications.map((a) => (
                <li key={a.id} className="border-b last:border-b-0" style={{ borderColor: "var(--ss-border)" }}>
                  <Link href={`/platform/applications/${a.id}`} className="block px-4 py-4">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="font-semibold text-sm min-w-0 break-words" style={{ color: "var(--ss-primary)" }}>
                        {a.restaurantName}
                      </p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-xs" style={{ color: "var(--ss-secondary)" }}>
                      {a.ownerName} · {a.phone}
                    </p>
                    <p className="text-xs break-all" style={{ color: "var(--ss-secondary)" }}>
                      {a.email}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--ss-secondary)" }}>
                      {a.city}, {a.state} · {a.tableCount} tables · {formatDate(a.createdAt)}
                    </p>
                    <p className="text-xs font-bold mt-2" style={{ color: "var(--ss-accent-dark)" }}>
                      View details →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ApplicationsView />
    </Suspense>
  );
}
