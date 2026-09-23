"use client";

import { Star } from "lucide-react";

interface RatingDistributionProps {
  distribution: Record<number, number>; // { 1: n, 2: n, 3: n, 4: n, 5: n }
  total: number;
}

export default function RatingDistribution({ distribution, total }: RatingDistributionProps) {
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-0.5 w-10 flex-shrink-0 font-bold" style={{ color: "var(--color-brown-900)" }}>
              {star} <Star size={11} fill="var(--color-orange-500)" color="var(--color-orange-500)" />
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-cream-200)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: "var(--color-orange-500)" }}
              />
            </div>
            <span className="w-8 text-right font-bold flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
