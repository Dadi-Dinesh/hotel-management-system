"use client";

/** Menu card loading skeleton — mirrors MenuCard's real layout so content
 * doesn't jump when it swaps in. */
export function SkeletonCard() {
  return (
    <div
      className="flex flex-col w-full overflow-hidden rounded-2xl"
      style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}
      aria-hidden="true"
    >
      <div className="w-full aspect-[4/3] ss-shimmer" />
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-2/3 rounded-full ss-shimmer" />
          <div className="h-4 w-10 rounded-full ss-shimmer" />
        </div>
        <div className="h-3 w-1/3 rounded-full ss-shimmer" />
        <div className="h-3 w-full rounded-full ss-shimmer" />
        <div className="h-9 w-full rounded-full ss-shimmer mt-1" />
      </div>
    </div>
  );
}

/** Row of pill-shaped placeholders for the category bar while categories load. */
export function CategoryPillSkeleton() {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {[64, 84, 72, 96, 60].map((w, i) => (
        <div key={i} className="h-8 rounded-full ss-shimmer flex-shrink-0" style={{ width: w }} />
      ))}
    </div>
  );
}

/** Compact row placeholder for cart line items while a session refetch is in flight. */
export function CartRowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-2xl"
      style={{ border: "1px solid var(--ss-border)" }}
      aria-hidden="true"
    >
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/2 rounded-full ss-shimmer" />
        <div className="h-3 w-1/4 rounded-full ss-shimmer" />
      </div>
      <div className="h-8 w-24 rounded-full ss-shimmer" />
    </div>
  );
}
