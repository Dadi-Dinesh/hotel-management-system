"use client";

/**
 * ServeSync Admin — clients (approved restaurants). Platform-level profile
 * data only; "View" opens the client profile, never the restaurant's own
 * operational dashboard.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Store } from "lucide-react";
import api from "../../lib/api";
import { PLATFORM_REFRESH_EVENT } from "../../components/platform/PlatformShell";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge, errorMessage, formatDate, timeAgo } from "../../components/platform/PlatformUI";
import { StatusToggleModal } from "../../components/platform/PlatformModals";

const FILTERS = [
  { key: "", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "SUSPENDED", label: "Suspended" },
];

export default function RestaurantsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [toggleTarget, setToggleTarget] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/platform/restaurants");
      setClients(res.data.data || []);
    } catch (err) {
      setError(errorMessage(err, "Please check your connection and try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(PLATFORM_REFRESH_EVENT, load);
    return () => window.removeEventListener(PLATFORM_REFRESH_EVENT, load);
  }, [load]);

  const counts = useMemo(
    () => ({ "": clients.length, ACTIVE: clients.filter((c) => c.status === "ACTIVE").length, SUSPENDED: clients.filter((c) => c.status === "SUSPENDED").length }),
    [clients]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter && c.status !== filter) return false;
      if (!q) return true;
      return [c.name, c.ownerName, c.email, c.phone].some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [clients, filter, query]);

  const actions = (c) => (
    <div className="flex gap-2">
      <Link href={`/platform/restaurants/${c.id}`} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--ss-border)", color: "var(--ss-primary)" }}>
        View
      </Link>
      {!c.isDemo && (
        <button
          onClick={() => setToggleTarget(c)}
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ border: "1px solid var(--ss-border)", color: c.status === "ACTIVE" ? "var(--ss-danger)" : "var(--ss-success)" }}
        >
          {c.status === "ACTIVE" ? "Suspend" : "Activate"}
        </button>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="Restaurants / Clients" description="Restaurants approved onto ServeSync, their owners and account status." />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" role="tablist" style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)" }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key || "all"}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap"
                style={{ background: active ? "var(--ss-primary)" : "transparent", color: active ? "#FFFDF8" : "var(--ss-secondary)" }}
              >
                {f.label} {!loading && <span className="tabular-nums opacity-80">({counts[f.key]})</span>}
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
            placeholder="Search restaurant, owner, email or phone"
            aria-label="Search clients"
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
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Store}
            title={clients.length === 0 ? "No clients yet" : "No matching clients"}
            description={clients.length === 0 ? "Approved restaurant applications become ServeSync clients here." : "Try a different filter or search."}
          />
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--ss-secondary)" }}>
                    {["Restaurant", "Owner", "Contact", "Status", "Joined", "Last activity", ""].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold border-b" style={{ borderColor: "var(--ss-border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr key={c.id} className="border-b last:border-b-0 align-top" style={{ borderColor: "var(--ss-border)" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold" style={{ color: "var(--ss-primary)" }}>
                            {c.name}
                          </span>
                          {c.isDemo && <StatusBadge status="DEMO" />}
                        </div>
                        <div className="text-xs" style={{ color: "var(--ss-secondary)" }}>
                          {c.tableCount} tables
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--ss-primary)" }}>
                        {c.ownerName || "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--ss-secondary)" }}>
                        <div className="break-all">{c.email || "—"}</div>
                        <div>{c.phone || ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--ss-secondary)" }}>
                        {formatDate(c.joinedAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--ss-secondary)" }}>
                        {c.lastActivityAt ? timeAgo(c.lastActivityAt) : "No orders yet"}
                      </td>
                      <td className="px-4 py-3">{actions(c)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="lg:hidden">
              {visible.map((c) => (
                <li key={c.id} className="px-4 py-4 border-b last:border-b-0" style={{ borderColor: "var(--ss-border)" }}>
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm break-words" style={{ color: "var(--ss-primary)" }}>
                        {c.name}
                      </p>
                      {c.isDemo && <StatusBadge status="DEMO" />}
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs" style={{ color: "var(--ss-secondary)" }}>
                    {c.ownerName || "—"}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </p>
                  {c.email && (
                    <p className="text-xs break-all" style={{ color: "var(--ss-secondary)" }}>
                      {c.email}
                    </p>
                  )}
                  <p className="text-xs mt-1 mb-3" style={{ color: "var(--ss-secondary)" }}>
                    Joined {formatDate(c.joinedAt)} · {c.lastActivityAt ? `Active ${timeAgo(c.lastActivityAt)}` : "No orders yet"}
                  </p>
                  {actions(c)}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {toggleTarget && <StatusToggleModal client={toggleTarget} onClose={() => setToggleTarget(null)} onChanged={load} />}
    </>
  );
}
