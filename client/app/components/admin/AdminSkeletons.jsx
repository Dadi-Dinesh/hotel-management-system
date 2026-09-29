"use client";

/** Realistic loading skeletons for the admin dashboard suite — shimmer
 * sweep (Sprint 2's `.ss-shimmer`), sized to match the real components. */

export function StatCardSkeleton() {
  return (
    <div className="rounded-[var(--ss-radius-card)] p-4 h-full" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }} aria-hidden="true">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl ss-shimmer" />
        <div className="w-10 h-3 rounded-full ss-shimmer" />
      </div>
      <div className="h-6 w-16 rounded-full ss-shimmer mb-2" />
      <div className="h-3 w-20 rounded-full ss-shimmer" />
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="rounded-[var(--ss-radius-card)] p-4 space-y-3" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }} aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded-full ss-shimmer" />
        <div className="h-5 w-16 rounded-full ss-shimmer" />
      </div>
      <div className="h-3 w-full rounded-full ss-shimmer" />
      <div className="h-3 w-2/3 rounded-full ss-shimmer" />
      <div className="h-9 w-full rounded-xl ss-shimmer" />
    </div>
  );
}

export function ChartSkeleton({ height = 280 }) {
  return (
    <div
      className="rounded-[var(--ss-radius-card)] p-4 sm:p-5"
      style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}
      aria-hidden="true"
    >
      <div className="h-4 w-32 rounded-full ss-shimmer mb-4" />
      <div className="rounded-xl ss-shimmer" style={{ height }} />
    </div>
  );
}

export function TableCardSkeleton() {
  return (
    <div className="rounded-[var(--ss-radius-card)] p-4 space-y-2.5" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }} aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="h-5 w-14 rounded-full ss-shimmer" />
        <div className="h-5 w-5 rounded-full ss-shimmer" />
      </div>
      <div className="h-3 w-20 rounded-full ss-shimmer" />
      <div className="h-8 w-full rounded-xl ss-shimmer" />
    </div>
  );
}
