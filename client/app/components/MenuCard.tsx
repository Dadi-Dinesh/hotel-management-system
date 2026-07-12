"use client";

import { Plus, Minus } from "lucide-react";
import MenuItemImage from "./MenuItemImage";
import { MenuItem } from "../types";

interface MenuCardProps {
  item: MenuItem;
  cartQuantity: number;
  onAdd: (item: MenuItem) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}

const getServingEmoji = (info: string): string => {
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

export default function MenuCard({
  item,
  cartQuantity = 0,
  onAdd,
  onUpdateQuantity,
}: MenuCardProps) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border p-4 transition-all hover:shadow-xs"
      style={{
        borderColor: "var(--color-brown-900)",
        background: "var(--color-surface)",
      }}
    >
      {/* Content Section (Image + Info) */}
      <div className="flex gap-4 items-center flex-1 min-w-0">
        {/* Lazy loaded food image with fallback */}
        <MenuItemImage src={item.imageUrl || item.image} alt={item.name} />

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

          {/* Description */}
          {item.description && (
            <p
              className="text-xs mt-1.5 text-gray-700 line-clamp-2 leading-relaxed"
            >
              {item.description}
            </p>
          )}

          {/* Calories */}
          {item.calories !== null && item.calories !== undefined && (
            <p
              className="text-[10px] uppercase font-bold mt-1 tracking-wider flex items-center gap-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              🔥 {item.calories} kcal
            </p>
          )}

          {/* Serving Information */}
          {item.servingInformation && (
            <div
              className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold"
              style={{ color: "var(--color-brown-800)" }}
            >
              <span>{getServingEmoji(item.servingInformation)}</span>
              <span>{item.servingInformation}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Section (Price & ADD button) */}
      <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0">
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
                borderRight: "1px solid var(--color-brown-900)",
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
                borderLeft: "1px solid var(--color-brown-900)",
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
