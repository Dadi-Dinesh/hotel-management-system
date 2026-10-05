"use client";

/**
 * ServeSync Admin — platform dashboard. Real counts only (GET /platform/stats),
 * the latest applications, and the persisted platform activity feed.
 * No restaurant-operational data (orders, menu, revenue) ever appears here.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, FileText, Store, XCircle } from "lucide-react";
import api from "../lib/api";
import { PLATFORM_REFRESH_EVENT } from "../components/platform/PlatformShell";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge, errorMessage, formatDate, timeAgo } from "../components/platform/PlatformUI";

function StatCard({ label, value, icon: Icon, href, tone }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl p-4 sm:p-5 transition-shadow hover:shadow-md"
      style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", boxShadow: "var(--ss-shadow-sm)" }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs sm:text-sm font-semibold" style={{ color: "var(--ss-secondary)" }}>
          {label}
        </p>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tone.bg, color: tone.fg }}>
          <Icon size={16} />
        </span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color: "var(--ss-primary)", fontFamily: "var(--font-heading)" }}>
        {value}
      </p>
    </Link>
  );
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, a, act] = await Promise.all([
        api.get("/platform/stats"),
        api.get("/platform/applications"),
        api.get("/platform/activity", { params: { limit: 8 } }),
      ]);
      setStats(s.data.data);
      setApplications((a.data.data || []).slice(0, 6));
      setActivity(act.data.data || []);
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

  return (
    <>
      <PageHeader title="Dashboard" description="An overview of restaurants on the ServeSync platform." />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Panel>
          <ErrorState message={error} onRetry={load} />
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard label="Total Restaurants" value={stats.totalRestaurants} icon={Store} href="/platform/restaurants" tone={{ bg: "var(--ss-accent-tint)", fg: "var(--ss-accent-dark)" }} />
            <StatCard label="Pending Applications" value={stats.pendingApplications} icon={Clock} href="/platform/applications?status=PENDING" tone={{ bg: "#FEF3C7", fg: "#92400E" }} />
            <StatCard label="Approved Restaurants" value={stats.approvedApplications} icon={CheckCircle2} href="/platform/applications?status=APPROVED" tone={{ bg: "#ECFDF5", fg: "#065F46" }} />
            <StatCard label="Rejected Applications" value={stats.rejectedApplications} icon={XCircle} href="/platform/applications?status=REJECTED" tone={{ bg: "#FEF2F2", fg: "#991B1B" }} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            <Panel
              className="xl:col-span-2"
              title="Recent Applications"
              bodyClassName=""
              action={
                <Link href="/platform/applications?status=" className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "var(--ss-accent-dark)" }}>
                  View all <ArrowRight size={13} />
                </Link>
              }
            >
              {applications.length === 0 ? (
                <EmptyState icon={FileText} title="No applications yet" description="Restaurant registrations from the ServeSync website will appear here." />
              ) : (
                <ul>
                  {applications.map((a) => (
                    <li key={a.id} className="border-b last:border-b-0" style={{ borderColor: "var(--ss-border)" }}>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-4 sm:px-5 py-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-sm truncate" style={{ color: "var(--ss-primary)" }}>
                              {a.restaurantName}
                            </p>
                            <StatusBadge status={a.status} />
                          </div>
                          <p className="text-xs mt-1 break-words" style={{ color: "var(--ss-secondary)" }}>
                            {a.ownerName} · {a.phone} · {a.email}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--ss-secondary)" }}>
                            {a.city}, {a.state} · Submitted {formatDate(a.createdAt)}
                          </p>
                        </div>
                        <Link
                          href={`/platform/applications/${a.id}`}
                          className="self-start md:self-center text-xs font-bold px-3 py-1.5 rounded-lg"
                          style={{ border: "1px solid var(--ss-border)", color: "var(--ss-primary)" }}
                        >
                          View
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Recent Platform Activity"
              bodyClassName=""
              action={
                <Link href="/platform/notifications" className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "var(--ss-accent-dark)" }}>
                  All <ArrowRight size={13} />
                </Link>
              }
            >
              {activity.length === 0 ? (
                <EmptyState title="No activity yet" description="Applications, approvals and provisioning will be logged here." />
              ) : (
                <ul>
                  {activity.map((n) => (
                    <li key={n.id} className="px-4 sm:px-5 py-3 border-b last:border-b-0" style={{ borderColor: "var(--ss-border)" }}>
                      <p className="text-sm" style={{ color: "var(--ss-primary)" }}>
                        {n.message}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ss-secondary)" }}>
                        {timeAgo(n.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
