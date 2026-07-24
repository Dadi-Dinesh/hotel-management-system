"use client";

import { X, Minus, Plus, ShoppingBag, Receipt, ArrowRight, Utensils } from "lucide-react";

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.7)" }} />

      {/* Drawer */}
      <div
        className="relative w-full max-w-md h-full flex flex-col border-l-2 shadow-2xl animate-slide-in-right"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-brown-900)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 sm:p-5 border-b"
          style={{ borderColor: "var(--color-brown-900)" }}
        >
          <div className="flex items-center gap-3">
            <ShoppingBag size={22} style={{ color: "var(--color-brown-900)" }} />
            <div>
              <h2
                className="text-lg sm:text-xl font-bold uppercase tracking-widest leading-none"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-brown-900)",
                }}
              >
                Order & Cart
              </h2>
              {tableCode && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-1">
                  Table {tableCode}
                </p>
              )}
            </div>
            <span
              className="text-xs px-2 py-0.5 font-bold border rounded-full ml-1"
              style={{
                borderColor: "var(--color-brown-900)",
                color: "var(--color-brown-900)",
                background: "var(--color-cream-100)"
              }}
            >
              {totalItemsCount}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 border flex items-center justify-center transition-colors hover:bg-brown-900 hover:text-white"
            style={{
              borderColor: "var(--color-brown-900)",
              color: "var(--color-brown-900)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Section 1: Active Placed Orders in Current Session */}
          {activePlacedOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-brown-900/20">
                <h3
                  className="text-xs font-black uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-brown-900)",
                  }}
                >
                  Placed Orders ({activePlacedOrders.length})
                </h3>
                {onViewOrders && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewOrders();
                    }}
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-orange-600 hover:underline"
                  >
                    View All <ArrowRight size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {activePlacedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 sm:p-4 border rounded-lg bg-amber-50/50 border-amber-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-xs font-bold"
                        style={{
                          fontFamily: "var(--font-heading)",
                          color: "var(--color-brown-900)",
                        }}
                      >
                        Order #{order.orderNumber}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-amber-200/60">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">
                              x{item.quantity}
                            </span>
                            <span className="font-medium text-brown-900">
                              {item.menuItem?.name || item.name}
                            </span>
                          </div>
                          <span className="font-bold text-brown-900">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-cream-100 border border-brown-900/20 rounded-lg flex items-center justify-between text-xs font-bold">
                <span className="uppercase text-gray-600 tracking-wider">Placed Session Total:</span>
                <span className="text-sm text-orange-600" style={{ fontFamily: "var(--font-heading)" }}>
                  ₹{runningTotal}
                </span>
              </div>
            </div>
          )}

          {/* Section 2: Draft Items (New items added to cart) */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-brown-900/20">
                <h3
                  className="text-xs font-black uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-brown-900)",
                  }}
                >
                  New Items to Order ({draftItemsCount})
                </h3>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex items-center gap-3 p-3 sm:p-4 border shadow-xs"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-brown-900)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold text-xs sm:text-sm uppercase tracking-wider truncate"
                        style={{
                          fontFamily: "var(--font-heading)",
                          color: "var(--color-brown-900)",
                        }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="text-xs sm:text-sm font-bold mt-0.5"
                        style={{ color: "var(--color-orange-500)" }}
                      >
                        ₹{item.price * item.quantity}
                      </p>
                    </div>

                    {item.name?.toLowerCase().includes("pulka") || item.name?.toLowerCase().includes("phulka") ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-500 uppercase">Qty:</span>
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
                          className="w-16 h-8 text-center font-black text-sm border-2 rounded-md bg-amber-50 focus:outline-none focus:border-orange-500 text-brown-900"
                          style={{ borderColor: "var(--color-brown-900)" }}
                        />
                      </div>
                    ) : (
                      <div
                        className="flex items-center border"
                        style={{
                          borderColor: "var(--color-brown-900)",
                        }}
                      >
                        <button
                          onClick={() =>
                            item.quantity === 1
                              ? onRemove(item.menuItemId)
                              : onUpdateQuantity(item.menuItemId, item.quantity - 1)
                          }
                          className="w-7 h-7 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
                          style={{ color: "var(--color-brown-900)", borderRight: "1px solid var(--color-brown-900)" }}
                        >
                          <Minus size={13} />
                        </button>
                        <span
                          className="text-xs sm:text-sm font-bold min-w-[28px] text-center"
                          style={{ color: "var(--color-brown-900)" }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
                          style={{ color: "var(--color-brown-900)", borderLeft: "1px solid var(--color-brown-900)" }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Empty State (No draft items AND no placed orders) */}
          {items.length === 0 && activePlacedOrders.length === 0 && (
            <div className="text-center py-16 border border-dashed border-brown-900/40 p-6">
              <p className="text-5xl mb-4">🛒</p>
              <p
                className="font-bold text-base uppercase tracking-widest mb-1"
                style={{ color: "var(--color-brown-900)" }}
              >
                Cart is empty
              </p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                No draft items or active orders yet. Browse our menu and add items to start ordering!
              </p>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div
          className="p-4 sm:p-5 border-t space-y-3"
          style={{
            borderColor: "var(--color-brown-900)",
            background: "var(--color-surface)",
          }}
        >
          {items.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <span
                    className="font-bold uppercase tracking-widest text-xs block"
                    style={{ color: "var(--color-brown-900)" }}
                  >
                    New Order Subtotal
                  </span>
                  {activePlacedOrders.length > 0 && (
                    <span className="text-[11px] font-medium text-gray-500">
                      Combined Total: ₹{runningTotal + draftTotal}
                    </span>
                  )}
                </div>
                <span
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-orange-500)",
                  }}
                >
                  ₹{draftTotal}
                </span>
              </div>
              <button
                onClick={onPlaceOrder}
                disabled={isOrdering}
                className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
              >
                <Utensils size={18} />
                {isOrdering ? "Placing..." : `Place Order (₹${draftTotal})`}
              </button>
            </>
          ) : activePlacedOrders.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className="font-bold uppercase tracking-widest text-xs"
                  style={{ color: "var(--color-brown-900)" }}
                >
                  Session Running Total
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-orange-500)",
                  }}
                >
                  ₹{runningTotal}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="btn-secondary flex-1 py-3 text-xs font-bold uppercase tracking-wider"
                >
                  + Add More Items
                </button>
                {onViewOrders && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewOrders();
                    }}
                    className="btn-primary flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Receipt size={16} /> View Orders & Bill
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
