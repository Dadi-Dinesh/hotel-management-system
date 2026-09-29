"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, ShoppingBag, ShoppingCart, Receipt, ArrowRight, Utensils } from "lucide-react";
import EmptyState from "./EmptyState";
import QuantitySelector from "./customer/QuantitySelector";
import CartSummary from "./customer/CartSummary";

export default function CartDrawer({
  items = [],
  placedOrders = [],
  runningTotal = 0,
  tableCode,
  onUpdateQuantity,
  onRemove,
  onClose,
  onPlaceOrder,
  isOrdering,
  onViewOrders,
}) {
  const activePlacedOrders = placedOrders.filter((o) => o.status !== "CANCELLED");
  const draftTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const draftItemsCount = items.reduce((s, i) => s + i.quantity, 0);
  const placedItemsCount = activePlacedOrders.reduce(
    (s, o) => s + o.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );
  const totalItemsCount = draftItemsCount + placedItemsCount;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: "rgba(59, 34, 10, 0.5)" }} />

      {/* Drawer — slides up from the bottom on mobile (sheet), in from the
          right on larger screens (side drawer). */}
      <motion.div
        initial={shouldReduceMotion ? false : { y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full h-[92vh] sm:h-full sm:max-w-md flex flex-col rounded-t-[var(--ss-radius-modal)] sm:rounded-none"
        style={{ background: "var(--ss-surface)", borderLeft: "1px solid var(--ss-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0" aria-hidden="true">
          <span className="w-10 h-1 rounded-full" style={{ background: "var(--ss-border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={20} style={{ color: "var(--ss-primary)" }} />
            <div>
              <h2 className="ss-h3" style={{ marginBottom: 0 }}>
                Order &amp; Cart
              </h2>
              {tableCode && (
                <p className="ss-caption font-semibold" style={{ color: "var(--ss-secondary)" }}>
                  Table {tableCode}
                </p>
              )}
            </div>
            {totalItemsCount > 0 && (
              <span
                className="ss-caption font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}
              >
                {totalItemsCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "var(--ss-bg)", color: "var(--ss-primary)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-6">
          {/* Section 1: Active Placed Orders in Current Session */}
          {activePlacedOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--ss-border)" }}>
                <h3 className="ss-caption font-bold" style={{ color: "var(--ss-primary)" }}>
                  Placed Orders ({activePlacedOrders.length})
                </h3>
                {onViewOrders && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewOrders();
                    }}
                    className="ss-caption font-bold flex items-center gap-1"
                    style={{ color: "var(--ss-accent-dark)" }}
                  >
                    View All <ArrowRight size={11} />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {activePlacedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-2xl"
                    style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="ss-small font-bold" style={{ color: "var(--ss-primary)" }}>
                        Order #{order.orderNumber}
                      </span>
                      <span className="ss-caption" style={{ color: "var(--ss-secondary)" }}>
                        {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: "var(--ss-border)" }}>
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between ss-small">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-bold px-1.5 py-0.5 rounded"
                              style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}
                            >
                              x{item.quantity}
                            </span>
                            <span className="font-medium" style={{ color: "var(--ss-primary)" }}>
                              {item.menuItem?.name || item.name}
                            </span>
                          </div>
                          <span className="font-bold" style={{ color: "var(--ss-primary)" }}>
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="p-3 rounded-2xl flex items-center justify-between ss-small font-bold"
                style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)" }}
              >
                <span style={{ color: "var(--ss-secondary)" }}>Placed Session Total</span>
                <span style={{ fontFamily: "var(--font-heading)", color: "var(--ss-accent-dark)" }}>₹{runningTotal}</span>
              </div>
            </div>
          )}

          {/* Section 2: Draft Items (New items added to cart) */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--ss-border)" }}>
                <h3 className="ss-caption font-bold" style={{ color: "var(--ss-primary)" }}>
                  New Items to Order ({draftItemsCount})
                </h3>
              </div>

              <div className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.menuItemId}
                      layout={!shouldReduceMotion}
                      initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="flex items-center gap-3 p-3 rounded-2xl overflow-hidden"
                      style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold ss-small truncate" style={{ color: "var(--ss-primary)" }}>
                          {item.name}
                        </p>
                        <p className="ss-small font-bold mt-0.5" style={{ color: "var(--ss-accent-dark)" }}>
                          ₹{item.price * item.quantity}
                        </p>
                      </div>

                      {item.name?.toLowerCase().includes("pulka") || item.name?.toLowerCase().includes("phulka") ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="ss-caption font-bold" style={{ color: "var(--ss-secondary)" }}>Qty:</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onKeyDown={(e) => {
                              if (e.key === "." || e.key === "e" || e.key === "-" || e.key === "+") {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                onRemove(item.menuItemId);
                                return;
                              }
                              const parsed = parseInt(raw, 10);
                              if (isNaN(parsed) || parsed < 1) {
                                onRemove(item.menuItemId);
                              } else {
                                onUpdateQuantity(item.menuItemId, Math.floor(parsed));
                              }
                            }}
                            className="ss-input w-14 h-8 text-center font-bold text-sm"
                            style={{
                              background: "var(--ss-bg)",
                              border: "1px solid var(--ss-border)",
                              borderRadius: "var(--ss-radius-input)",
                              color: "var(--ss-primary)",
                            }}
                            aria-label={`Quantity for ${item.name}`}
                          />
                        </div>
                      ) : (
                        <QuantitySelector
                          quantity={item.quantity}
                          onDecrement={() =>
                            item.quantity === 1 ? onRemove(item.menuItemId) : onUpdateQuantity(item.menuItemId, item.quantity - 1)
                          }
                          onIncrement={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
                          size="sm"
                        />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Section 3: Empty State (No draft items AND no placed orders) */}
          {items.length === 0 && activePlacedOrders.length === 0 && (
            <EmptyState
              icon={<ShoppingCart size={28} style={{ color: "var(--ss-secondary)" }} />}
              title="Your cart is waiting"
              description="Browse the menu and add a few dishes to get started."
              action={
                <button
                  onClick={onClose}
                  className="ss-btn px-5 py-2.5 ss-small font-semibold"
                  data-variant="primary"
                  style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
                >
                  Continue Browsing
                </button>
              }
            />
          )}
        </div>

        {/* Footer Controls — always visible, never scrolls away */}
        <div className="px-4 sm:px-5 py-4 border-t space-y-3 flex-shrink-0" style={{ borderColor: "var(--ss-border)", background: "var(--ss-surface)" }}>
          {items.length > 0 ? (
            <>
              <CartSummary subtotal={draftTotal} label={activePlacedOrders.length > 0 ? "New Items Subtotal" : "Subtotal"} />
              {activePlacedOrders.length > 0 && (
                <p className="ss-caption" style={{ color: "var(--ss-secondary)" }}>
                  Combined with placed orders: <strong style={{ color: "var(--ss-primary)" }}>₹{runningTotal + draftTotal}</strong>
                </p>
              )}
              <button
                onClick={onPlaceOrder}
                disabled={isOrdering}
                className="ss-btn w-full py-4 ss-body font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                data-variant="primary"
                style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)", boxShadow: "var(--ss-shadow-md)" }}
              >
                <Utensils size={18} />
                {isOrdering ? "Placing..." : `Place Order (₹${draftTotal})`}
              </button>
            </>
          ) : activePlacedOrders.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="ss-small font-semibold" style={{ color: "var(--ss-secondary)" }}>
                  Session Running Total
                </span>
                <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-accent-dark)" }}>
                  ₹{runningTotal}
                </span>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={onClose}
                  className="ss-btn flex-1 py-3 ss-caption font-bold"
                  data-variant="secondary"
                  style={{ background: "var(--ss-surface)", color: "var(--ss-primary)", border: "1px solid var(--ss-border)", borderRadius: "var(--ss-radius-button)" }}
                >
                  + Add More Items
                </button>
                {onViewOrders && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewOrders();
                    }}
                    className="ss-btn flex-1 py-3 ss-caption font-bold flex items-center justify-center gap-1.5"
                    data-variant="primary"
                    style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
                  >
                    <Receipt size={15} /> View Orders &amp; Bill
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
