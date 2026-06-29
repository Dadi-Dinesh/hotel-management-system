"use client";

import { X, Minus, Plus, ShoppingBag } from "lucide-react";

export default function CartDrawer({ items, onUpdateQuantity, onRemove, onClose, onPlaceOrder, isOrdering }) {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.7)" }} />

      {/* Drawer */}
      <div
        className="relative w-full max-w-md h-full flex flex-col border-l-2"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-brown-900)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: "var(--color-brown-900)" }}
        >
          <div className="flex items-center gap-3">
            <ShoppingBag size={24} style={{ color: "var(--color-brown-900)" }} />
            <h2
              className="text-xl font-bold uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-brown-900)",
              }}
            >
              Order
            </h2>
            <span
              className="text-xs px-2 py-0.5 font-bold border"
              style={{
                borderColor: "var(--color-brown-900)",
                color: "var(--color-brown-900)",
              }}
            >
              {items.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 border flex items-center justify-center transition-colors hover:bg-brown-900 hover:text-white"
            style={{
              borderColor: "var(--color-brown-900)",
              color: "var(--color-brown-900)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-brown-900">
              <p className="text-5xl mb-4">🛒</p>
              <p
                className="font-bold uppercase tracking-widest"
                style={{ color: "var(--color-brown-900)" }}
              >
                Cart is empty
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.menuItemId}
                className="flex items-center gap-4 p-4 border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-brown-900)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-sm uppercase tracking-wider truncate"
                    style={{
                      fontFamily: "var(--font-heading)",
                      color: "var(--color-brown-900)",
                    }}
                  >
                    {item.name}
                  </p>
                  <p
                    className="text-sm font-bold mt-1"
                    style={{ color: "var(--color-orange-500)" }}
                  >
                    ₹{item.price * item.quantity}
                  </p>
                </div>

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
                    className="w-8 h-8 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
                    style={{ color: "var(--color-brown-900)", borderRight: "1px solid var(--color-brown-900)" }}
                  >
                    <Minus size={14} />
                  </button>
                  <span
                    className="text-sm font-bold min-w-[32px] text-center"
                    style={{ color: "var(--color-brown-900)" }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
                    style={{ color: "var(--color-brown-900)", borderLeft: "1px solid var(--color-brown-900)" }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="p-5 border-t space-y-4"
            style={{
              borderColor: "var(--color-brown-900)",
              background: "var(--color-surface)",
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="font-bold uppercase tracking-widest text-sm"
                style={{ color: "var(--color-brown-900)" }}
              >
                Total Amount
              </span>
              <span
                className="text-2xl font-bold"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-orange-500)",
                }}
              >
                ₹{total}
              </span>
            </div>
            <button
              onClick={onPlaceOrder}
              disabled={isOrdering}
              className="btn-primary w-full py-4 text-lg"
            >
              {isOrdering ? "Placing..." : "Place Order"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
