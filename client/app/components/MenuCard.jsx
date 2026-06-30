"use client";

import { Plus, Minus } from "lucide-react";

export default function MenuCard({ item, cartQuantity = 0, onAdd, onUpdateQuantity }) {
  return (
    <div
      className="flex gap-4 border p-4"
      style={{ borderColor: "var(--color-brown-900)", background: "var(--color-surface)" }}
    >
      {/* Image */}
      <div
        className="w-24 h-24 flex-shrink-0 flex items-center justify-center text-3xl border"
        style={{
          borderColor: "var(--color-brown-900)",
          background: "var(--color-cream-200)",
        }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          "🍽️"
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <h3
            className="font-bold text-base uppercase tracking-wide truncate"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-brown-900)",
            }}
          >
            {item.name}
          </h3>
          <p
            className="text-xs uppercase tracking-widest mt-1"
            style={{ color: "var(--color-text-muted)", fontWeight: 600 }}
          >
            {item.category?.name}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-1 text-xs font-bold" style={{ color: "var(--color-orange-600)" }}>
            <span>⭐ {item.totalReviews && item.totalReviews > 0 ? (item.averageRating < 3.0 ? "3.0" : item.averageRating.toFixed(1)) : "3.0"}</span>
            <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>
              ({item.totalReviews || 0} {item.totalReviews === 1 ? "Review" : "Reviews"})
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span
            className="font-bold text-lg"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-orange-500)",
            }}
          >
            ₹{item.price}
          </span>

          {cartQuantity === 0 ? (
            <button
              onClick={() => onAdd(item)}
              className="btn-primary"
              style={{
                padding: "0.375rem 1rem",
                fontSize: "0.8125rem",
              }}
            >
              <Plus size={16} /> ADD
            </button>
          ) : (
            <div
              className="flex items-center border"
              style={{
                borderColor: "var(--color-brown-900)",
              }}
            >
              <button
                onClick={() => onUpdateQuantity(item.id, cartQuantity - 1)}
                className="flex items-center justify-center w-8 h-8 transition-colors hover:bg-orange-500 hover:text-white"
                style={{
                  color: "var(--color-brown-900)",
                  borderRight: "1px solid var(--color-brown-900)"
                }}
              >
                <Minus size={14} />
              </button>
              <span
                className="font-bold text-sm min-w-[32px] text-center"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-brown-900)",
                }}
              >
                {cartQuantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.id, cartQuantity + 1)}
                className="flex items-center justify-center w-8 h-8 transition-colors hover:bg-orange-500 hover:text-white"
                style={{
                  color: "var(--color-brown-900)",
                  borderLeft: "1px solid var(--color-brown-900)"
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
