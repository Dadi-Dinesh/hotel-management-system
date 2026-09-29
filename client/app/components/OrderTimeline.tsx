"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChefHat, Circle, PackageCheck, Soup, XCircle } from "lucide-react";

interface OrderTimelineProps {
  status: "PENDING" | "ACCEPTED" | "PREPARING" | "SERVED" | "CANCELLED";
}

// Backend OrderStatus has no distinct "READY" state — Ready and Served
// both reflect as reached once the backend reports SERVED, since there is
// no separate signal between "food ready" and "served" in this system.
const STAGES = [
  { key: "PENDING", label: "Placed", icon: Circle },
  { key: "ACCEPTED", label: "Accepted", icon: CheckCircle2 },
  { key: "PREPARING", label: "Preparing", icon: ChefHat },
  { key: "READY", label: "Ready", icon: Soup },
  { key: "SERVED", label: "Served", icon: PackageCheck },
];

const STATUS_INDEX: Record<string, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  // No backend "READY" — SERVED satisfies both the Ready and Served stages.
  SERVED: 4,
};

export default function OrderTimeline({ status }: OrderTimelineProps) {
  const shouldReduceMotion = useReducedMotion();

  if (status === "CANCELLED") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl ss-small font-bold"
        style={{ background: "rgba(214, 69, 69, 0.1)", color: "var(--ss-danger)", border: "1px solid rgba(214, 69, 69, 0.25)" }}
      >
        <XCircle size={16} />
        Order Cancelled
      </div>
    );
  }

  const activeIndex = STATUS_INDEX[status] ?? 0;

  return (
    <div className="flex items-center w-full" role="list" aria-label="Order progress">
      {STAGES.map((stage, i) => {
        const reached = i <= activeIndex;
        const isCurrent = i === activeIndex && status !== "SERVED";
        const Icon = stage.icon;
        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none" role="listitem">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <motion.div
                initial={false}
                animate={{ scale: isCurrent && !shouldReduceMotion ? [1, 1.12, 1] : 1 }}
                transition={{ duration: 1.4, repeat: isCurrent ? Infinity : 0, ease: "easeInOut" }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                style={{
                  background: reached ? "var(--ss-accent)" : "var(--ss-bg)",
                  borderColor: reached ? "var(--ss-accent)" : "var(--ss-border)",
                  color: reached ? "var(--ss-on-accent)" : "var(--ss-secondary)",
                }}
                aria-current={isCurrent ? "step" : undefined}
              >
                <Icon size={14} />
              </motion.div>
              <span
                className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center leading-tight"
                style={{ color: reached ? "var(--ss-primary)" : "var(--ss-secondary)" }}
              >
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className="flex-1 h-[2px] mx-1 -mt-4 rounded-full overflow-hidden" style={{ background: "var(--ss-border)" }}>
                <motion.div
                  initial={false}
                  animate={{ width: i < activeIndex ? "100%" : "0%" }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: "easeOut" }}
                  className="h-full"
                  style={{ background: "var(--ss-accent)" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
