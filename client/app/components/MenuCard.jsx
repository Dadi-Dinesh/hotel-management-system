"use client";

import { Plus, Minus } from "lucide-react";

const getServingEmoji = (info) => {
  if (!info) return "";
  const lower = info.toLowerCase();
  if (lower.includes("people") || lower.includes("person") || lower.includes("adult") || lower.includes("serves")) {
    if (lower.includes("family")) return "👨‍👩‍👧";
    return "👥";
  }
  if (lower.includes("roti") || lower.includes("pulka") || lower.includes("naan") || lower.includes("paratha") || lower.includes("phulka")) {
    return "🫓";
  }
  if (lower.includes("family") || lower.includes("pack")) {
    return "👨‍👩‍👧";
  }
  return "🍽️";
};

export default function MenuCard({ item, cartQuantity = 0, onAdd, onUpdateQuantity }) {
  return (
    <div
      className="flex flex-col md:flex-row md:items-center justify-between gap-4 border p-4"
      style={{ borderColor: "var(--color-brown-900)", background: "var(--color-surface)" }}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
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
      </div>

      {/* Action Section */}
      <div className="flex items-center justify-between md:justify-end gap-6 flex-shrink-0">
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
            className="btn-primary font-bold text-xs uppercase tracking-wider"
            style={{
              padding: "0.5rem 1.25rem",
            }}
          >
            <Plus size={14} /> ADD
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
  );
}
