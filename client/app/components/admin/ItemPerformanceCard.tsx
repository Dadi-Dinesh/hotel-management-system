"use client";

import { motion } from "framer-motion";
import MenuItemImage from "../MenuItemImage";
import { VegBadge, NonVegBadge } from "../LoadingScreen";

interface ItemPerformanceCardProps {
  item: {
    name: string;
    image?: string | null;
    category: string;
    isVeg: boolean;
    quantity: number;
    revenue: number;
    popularity?: number;
    orderCount: number;
  };
  variant?: "best" | "worst";
}

export default function ItemPerformanceCard({ item, variant = "best" }: ItemPerformanceCardProps) {
  const barColor = variant === "best" ? "var(--color-success)" : "var(--color-orange-500)";

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 p-3 rounded-xl border"
      style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}
    >
      <div className="relative flex-shrink-0">
        <MenuItemImage src={item.image} alt={item.name} variant="thumbnail" />
        <div className="absolute -top-1 -left-1">{item.isVeg ? <VegBadge className="w-4 h-4" /> : <NonVegBadge className="w-4 h-4" />}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate" style={{ color: "var(--color-brown-900)" }}>
          {item.name}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>
          {item.category}
        </p>
        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
          <span style={{ color: "var(--color-text-secondary)" }}>{item.quantity} sold</span>
          <span style={{ color: "var(--color-orange-600)" }}>₹{item.revenue.toLocaleString("en-IN")}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-cream-200)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(item.popularity ?? 0, item.quantity > 0 ? 4 : 0)}%`, background: barColor }}
          />
        </div>
      </div>
    </motion.div>
  );
}
