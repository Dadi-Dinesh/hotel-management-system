"use client";

/** ServeSync Admin — full platform activity feed (persisted AuditLog entries). */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, CheckCircle2, FileText, KeyRound, PauseCircle, QrCode, XCircle } from "lucide-react";
import api from "../../lib/api";
import { PLATFORM_REFRESH_EVENT } from "../../components/platform/PlatformShell";
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Panel, errorMessage, formatDate, timeAgo } from "../../components/platform/PlatformUI";

const ICONS = {
  "application.submitted": FileText,
  "application.approved": CheckCircle2,
  "application.rejected": XCircle,
  "platform.credentials.provisioned": KeyRound,
  "platform.credentials.issued": KeyRound,
  "platform.qr_package.generated": QrCode,
  "platform.restaurant.suspended": PauseCircle,
  "platform.restaurant.deactivated": PauseCircle,
};

const PAGE_SIZE = 30;

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/platform/activity", { params: { limit: PAGE_SIZE } });
      setItems(res.data.data || []);
      setHasMore(Boolean(res.data.hasMore));
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

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await api.get("/platform/activity", { params: { limit: PAGE_SIZE, before: items[items.length - 1]?.createdAt } });
      setItems((prev) => [...prev, ...(res.data.data || [])]);
      setHasMore(Boolean(res.data.hasMore));
    } catch (err) {
      setError(errorMessage(err, "Couldn't load more activity."));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <PageHeader title="Notifications" description="Applications, approvals, rejections and provisioning across the platform." />
      <Panel bodyClassName="">
        {loading ? (
          <LoadingState />
        ) : error && items.length === 0 ? (
          <ErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState icon={Activity} title="No notifications yet" description="New restaurant applications and platform actions will appear here." />
        ) : (
          <>
            <ul>
              {items.map((n) => {
                const Icon = ICONS[n.type] || Activity;
                const href = n.applicationId ? `/platform/applications/${n.applicationId}` : n.restaurantId ? `/platform/restaurants/${n.restaurantId}` : null;
                const body = (
                  <div className="flex items-start gap-3 px-4 sm:px-5 py-3.5">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm" style={{ color: "var(--ss-primary)" }}>
                        {n.message}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ss-secondary)" }} title={formatDate(n.createdAt, true) || undefined}>
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className="border-b last:border-b-0" style={{ borderColor: "var(--ss-border)" }}>
                    {href ? (
                      <Link href={href} className="block hover:bg-[var(--ss-bg)]">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div className="p-4 text-center border-t" style={{ borderColor: "var(--ss-border)" }}>
                <Button size="sm" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load older activity"}
                </Button>
              </div>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
