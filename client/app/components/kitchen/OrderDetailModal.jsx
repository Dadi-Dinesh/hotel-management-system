"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, Clock } from "lucide-react";
import KitchenTimer from "./KitchenTimer";
import { groupOrderItems, shortSessionRef } from "../../lib/kitchenUtils";

export default function OrderDetailModal({ order, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!order) return null;

  const tableCode = order.session?.table?.code || order.tableCode || "—";
  const groupedItems = groupOrderItems(order.items || []);
  const timeStr = new Date(order.createdAt).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const notes = order.notes || order.specialInstructions;
  const waiterName = order.waiterName || order.acceptedBy?.name;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(2, 6, 23, 0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Order ${order.orderNumber} details`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide text-white">
              Table {tableCode} · Order #{order.orderNumber}
            </h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Session {shortSessionRef(order.sessionId || order.session?.id)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-slate-400 font-bold">
              <Clock size={14} /> Received {timeStr}
            </span>
            <KitchenTimer since={order.createdAt} />
          </div>

          {waiterName && (
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Waiter: <span className="text-slate-200">{waiterName}</span>
            </p>
          )}

          <div className="space-y-2">
            {groupedItems.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-800 bg-slate-900"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0 border"
                    style={{
                      background: item.isVeg ? "#065F46" : "#7F1D1D",
                      borderColor: item.isVeg ? "#10B981" : "#EF4444",
                    }}
                    aria-label={item.isVeg ? "Veg" : "Non-Veg"}
                  />
                  <span className="text-sm font-bold text-slate-100 truncate">{item.name}</span>
                </div>
                <span className="text-sm font-black text-amber-400 flex-shrink-0">×{item.quantity}</span>
              </div>
            ))}
          </div>

          {notes && (
            <div className="p-3 rounded-lg border border-amber-700/50 bg-amber-950/40">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-400 mb-1">
                Special Instructions
              </p>
              <p className="text-sm text-amber-100">{notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
