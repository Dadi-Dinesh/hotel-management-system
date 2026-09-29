"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, Flame, Check } from "lucide-react";
import KitchenTimer from "./KitchenTimer";
import { computePriority, groupOrderItems, shortSessionRef } from "../../lib/kitchenUtils";

function KitchenTicket({
  order,
  elapsedMs,
  column, // "NEW" | "PREPARING" | "READY"
  isUpdating,
  isJustReady,
  onStartPreparing,
  onMarkReady,
  onViewDetails,
}) {
  const shouldReduceMotion = useReducedMotion();
  const tableCode = order.session?.table?.code || order.tableCode || "—";
  const groupedItems = groupOrderItems(order.items || []);
  const priority = computePriority(order, elapsedMs);
  const notes = order.notes || order.specialInstructions;
  const waiterName = order.waiterName || order.acceptedBy?.name;
  const timeStr = new Date(order.createdAt).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <motion.div
      layout={!shouldReduceMotion}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{
        opacity: 1,
        scale: 1,
        boxShadow: isJustReady && !shouldReduceMotion
          ? ["0 0 0 0 rgba(16,185,129,0.7)", "0 0 0 14px rgba(16,185,129,0)"]
          : "none",
      }}
      transition={{
        layout: { duration: 0.3, ease: "easeOut" },
        boxShadow: { duration: 1.1, repeat: isJustReady ? 2 : 0 },
        default: { duration: 0.25 },
      }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      className="bg-slate-950 border rounded-xl p-3 flex flex-col gap-2.5 flex-shrink-0"
      style={{ borderColor: priority.isHigh ? "#F59E0B" : "#1E293B" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-base font-black uppercase text-white">Table {tableCode}</span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 rounded px-1.5 py-0.5">
              #{order.orderNumber}
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">
            Session {shortSessionRef(order.sessionId || order.session?.id)} · {timeStr}
          </p>
        </div>
        <KitchenTimer since={order.createdAt} className="text-xs flex-shrink-0" />
      </div>

      {/* Priority + waiter row */}
      {(priority.isHigh || waiterName) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {priority.isHigh ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-950/70 text-orange-400 border border-orange-700/60">
              <Flame size={10} /> High Priority
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-900 text-slate-500 border border-slate-800">
              Normal
            </span>
          )}
          {waiterName && (
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Waiter: {waiterName}
            </span>
          )}
        </div>
      )}

      {/* Item list (grouped/deduped for display only) */}
      <div className="space-y-1">
        {groupedItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-slate-900/70"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border"
                style={{
                  background: item.isVeg ? "#065F46" : "#7F1D1D",
                  borderColor: item.isVeg ? "#10B981" : "#EF4444",
                }}
                aria-hidden="true"
              />
              <span className="text-xs font-bold text-slate-100 truncate">{item.name}</span>
            </div>
            <span className="text-xs font-black text-amber-400 flex-shrink-0">×{item.quantity}</span>
          </div>
        ))}
      </div>

      {notes && (
        <p className="text-[11px] font-bold text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded px-2 py-1 line-clamp-2">
          Note: {notes}
        </p>
      )}

      {/* Quick actions — large, one-handed / gloved-hand friendly touch targets */}
      <div className="flex items-center gap-2 pt-1 mt-auto">
        {column === "NEW" && (
          <button
            onClick={() => onStartPreparing(order.id)}
            disabled={isUpdating}
            className="flex-1 min-h-[48px] py-3 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            <Flame size={15} />
            {isUpdating ? "Updating..." : "Start Preparing"}
          </button>
        )}
        {column === "PREPARING" && (
          <button
            onClick={() => onMarkReady(order.id)}
            disabled={isUpdating}
            className="flex-1 min-h-[48px] py-3 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            <Check size={15} />
            {isUpdating ? "Updating..." : "Mark Ready"}
          </button>
        )}
        {column === "READY" && (
          <span className="flex-1 min-h-[48px] py-3 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-700/50">
            <Check size={15} /> Sent to Waiter
          </span>
        )}
        <button
          onClick={() => onViewDetails(order)}
          className="w-12 min-h-[48px] flex-shrink-0 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-[0.98] transition-all"
          aria-label="View order details"
          title="View Details"
        >
          <Eye size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// Memoized — only re-renders when its own order/column/flags actually change,
// not when sibling tickets or unrelated board state update.
export default memo(KitchenTicket);
