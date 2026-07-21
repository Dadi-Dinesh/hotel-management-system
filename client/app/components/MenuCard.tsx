"use client";

import { useState } from "react";
import { Plus, Minus, Star } from "lucide-react";
import MenuItemImage from "./MenuItemImage";
import FoodDetailModal from "./FoodDetailModal";
import { VegBadge, NonVegBadge } from "./LoadingScreen";
import { MenuItem } from "../types";

interface MenuCardProps {
  item: MenuItem;
  cartQuantity: number;
  onAdd: (item: MenuItem) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}

const getServingEmoji = (info?: string | null): string => {
  if (!info) return "";
  const lower = info.toLowerCase();
  if (lower.includes("people") || lower.includes("person") || lower.includes("adult") || lower.includes("serves")) {
    if (lower.includes("family")) return "👨‍👩‍👧";
    return "👥";
  }
  if (lower.includes("roti") || lower.includes("pulka") || lower.includes("naan") || lower.includes("paratha") || lower.includes("phulka")) {
    return "🫓";
  }
  if (lower.includes("family") || lower.includes("pack")) return "👨‍👩‍👧";
  return "🍽️";
};

const renderStarString = (rating: number) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return "★".repeat(full) + (half ? "★" : "") + "☆".repeat(empty);
};

export default function MenuCard({
  item,
  cartQuantity = 0,
  onAdd,
  onUpdateQuantity,
}: MenuCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const displayRating = item.displayRating || (item.rating && item.rating < 3 ? 3.0 : item.rating) || 4.2;
  const ratingCount = item.ratingCount || 100;

  return (
    <>
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border p-3 sm:p-4 transition-all hover:shadow-xs w-full max-w-full overflow-hidden relative"
        style={{
          borderColor: "var(--color-brown-900)",
          background: "var(--color-surface)",
        }}
      >
        {/* Content Section (Image + Info) */}
        <div className="flex gap-3 sm:gap-4 items-start sm:items-center flex-1 min-w-0 w-full">
          {/* Clickable Image */}
          <div className="relative">
            <MenuItemImage
              src={item.imageUrl || item.image}
              alt={item.name}
              onClick={() => setShowDetail(true)}
            />
            {/* Veg / Non-Veg Badge */}
            <div className="absolute top-1 left-1 z-10">
              {item.isVeg ? <VegBadge /> : <NonVegBadge />}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="font-bold text-sm sm:text-base uppercase tracking-wide truncate"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
              >
                {item.name}
              </h3>
              {item.isPopular && (
                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500 text-white flex-shrink-0">
                  🔥 POPULAR
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 sm:mt-1 flex-wrap">
              <p
                className="text-[10px] sm:text-xs uppercase tracking-widest truncate"
                style={{ color: "var(--color-text-muted)", fontWeight: 600 }}
              >
                {item.category?.name}
              </p>
              {item.spiceLevel && (
                <span className="text-[10px] font-semibold text-orange-600">
                  🌶️ {item.spiceLevel}
                </span>
              )}
            </div>

            {item.description && (
              <p className="text-xs mt-1 sm:mt-1.5 text-gray-700 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}

            {item.servingInformation && (
              <div
                className="flex items-center gap-1.5 mt-2 text-[11px] sm:text-xs font-semibold"
                style={{ color: "var(--color-brown-800)" }}
              >
                <span>{getServingEmoji(item.servingInformation)}</span>
                <span className="truncate">{item.servingInformation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Section (Rating + Price & ADD / qty controls) */}
        <div className="flex flex-col sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-cream-200">
          
          {/* Rating Display ABOVE ADD button */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 sm:justify-end">
            <span className="text-amber-500 text-sm tracking-tighter">
              {renderStarString(displayRating)}
            </span>
            <span className="font-bold text-brown-900">{displayRating.toFixed(1)}</span>
            <span className="text-[11px] font-normal text-gray-500">
              ({ratingCount} Reviews)
            </span>
          </div>

          {/* Price & ADD Button Row */}
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto">
            <span
              className="font-bold text-base sm:text-lg"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-500)" }}
            >
              ₹{item.price}
            </span>

            {cartQuantity === 0 ? (
              <button
                onClick={() => onAdd(item)}
                className="btn-primary font-bold text-xs uppercase tracking-wider flex items-center gap-1"
                style={{ padding: "0.45rem 1rem" }}
              >
                <Plus size={14} /> ADD
              </button>
            ) : (
              <div
                className="flex items-center border"
                style={{ borderColor: "var(--color-brown-900)" }}
              >
                <button
                  onClick={() => onUpdateQuantity(item.id, cartQuantity - 1)}
                  className="flex items-center justify-center w-8 h-8 transition-colors hover:bg-orange-500 hover:text-white"
                  style={{ color: "var(--color-brown-900)", borderRight: "1px solid var(--color-brown-900)" }}
                >
                  <Minus size={14} />
                </button>
                <span
                  className="font-bold text-sm min-w-[32px] text-center"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
                >
                  {cartQuantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, cartQuantity + 1)}
                  className="flex items-center justify-center w-8 h-8 transition-colors hover:bg-orange-500 hover:text-white"
                  style={{ color: "var(--color-brown-900)", borderLeft: "1px solid var(--color-brown-900)" }}
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {showDetail && (
        <FoodDetailModal
          item={item}
          cartQuantity={cartQuantity}
          onClose={() => setShowDetail(false)}
          onAdd={onAdd}
          onUpdateQuantity={onUpdateQuantity}
        />
      )}
    </>
  );
}
