"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Plus, Minus } from "lucide-react";
import MenuItemImage from "./MenuItemImage";
import FoodDetailModal from "./FoodDetailModal";
import { VegBadge, NonVegBadge } from "./LoadingScreen";
import { MenuItem } from "../types";

import toast from "react-hot-toast";

interface MenuCardProps {
  item: MenuItem;
  cartQuantity: number;
  onAdd: (item: MenuItem) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}

const isQuantityItem = (name: string = "") => {
  const lower = name.toLowerCase();
  return (
    lower.includes("roti") ||
    lower.includes("pulka") ||
    lower.includes("phulka") ||
    lower.includes("chapati") ||
    lower.includes("naan") ||
    lower.includes("paratha")
  );
};

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
  const [inputString, setInputString] = useState<string>(cartQuantity > 0 ? String(cartQuantity) : "");
  const shouldReduceMotion = useReducedMotion();

  const displayRating = item.displayRating || (item.rating && item.rating < 3 ? 3.0 : item.rating) || 4.2;
  const ratingCount = item.ratingCount || 100;
  const isQtyItem = isQuantityItem(item.name);

  const handleApplyQuantity = () => {
    const parsed = parseInt(inputString, 10);
    if (isNaN(parsed) || parsed < 1) {
      toast.error("Please enter a valid quantity (minimum 1)");
      return;
    }
    const validQty = Math.floor(parsed);
    if (cartQuantity === 0) {
      onAdd(item);
    }
    onUpdateQuantity(item.id, validQty);
    setInputString(String(validQty));
    toast.success(`Added ${validQty}x ${item.name} to cart! 🫓`);
  };

  return (
    <>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
          show: { opacity: 1, y: 0 },
        }}
        whileHover={shouldReduceMotion ? undefined : { y: -4 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col w-full max-w-full overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--color-border-light)",
          background: "var(--color-surface)",
          boxShadow: "0 6px 20px -12px rgba(61, 39, 16, 0.25)",
        }}
      >
        {/* Large image with overlay badges */}
        <div className="relative">
          <MenuItemImage
            src={item.imageUrl || item.image}
            alt={item.name}
            variant="large"
            onClick={() => setShowDetail(true)}
          />
          <div className="absolute top-2.5 left-2.5 z-10">
            {item.isVeg ? <VegBadge /> : <NonVegBadge />}
          </div>
          {item.isPopular && (
            <span
              className="absolute top-2.5 right-2.5 z-10 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-amber-500 text-white shadow-sm"
            >
              🔥 Popular
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-3.5 sm:p-4 gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-bold text-sm sm:text-base uppercase tracking-wide leading-tight cursor-pointer"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
              onClick={() => setShowDetail(true)}
            >
              {item.name}
            </h3>
            <span
              className="font-bold text-base sm:text-lg flex-shrink-0"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-500)" }}
            >
              ₹{item.price}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
            <span className="text-amber-500 text-sm tracking-tighter">
              {renderStarString(displayRating)}
            </span>
            <span className="font-bold text-brown-900">{displayRating.toFixed(1)}</span>
            <span className="text-[11px] font-normal text-gray-500">
              ({ratingCount})
            </span>
          </div>

          {item.description && (
            <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {(item.servingInformation || item.calories != null) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.servingInformation && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-1 rounded-full"
                  style={{ background: "var(--color-cream-100)", color: "var(--color-brown-800)" }}
                >
                  {getServingEmoji(item.servingInformation)} {item.servingInformation}
                </span>
              )}
              {item.calories != null && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
                  style={{ background: "var(--color-cream-100)", color: "var(--color-text-muted)" }}
                >
                  <Flame size={10} /> {item.calories} kcal
                </span>
              )}
            </div>
          )}

          {/* Add / quantity controls */}
          <div className="mt-auto pt-2.5">
            {isQtyItem ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Qty"
                  value={inputString}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "." || e.key === "e" || e.key === "-" || e.key === "+") {
                      e.preventDefault();
                    }
                    if (e.key === "Enter") {
                      handleApplyQuantity();
                    }
                  }}
                  onChange={(e) => setInputString(e.target.value)}
                  className="w-16 h-9 text-center font-extrabold text-base border-2 rounded-lg bg-amber-50/60 focus:outline-none focus:border-orange-500 text-brown-900 shadow-xs"
                  style={{ borderColor: "var(--color-brown-900)" }}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleApplyQuantity}
                  className="btn-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs h-9 flex-1"
                  style={{ borderRadius: "0.5rem" }}
                >
                  <Plus size={14} /> ADD
                </motion.button>
              </div>
            ) : cartQuantity === 0 ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onAdd(item)}
                className="btn-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 w-full py-2.5"
                style={{ borderRadius: "0.5rem" }}
              >
                <Plus size={14} /> ADD TO CART
              </motion.button>
            ) : (
              <div
                className="flex items-center justify-between border rounded-lg overflow-hidden"
                style={{ borderColor: "var(--color-brown-900)" }}
              >
                <button
                  onClick={() => onUpdateQuantity(item.id, cartQuantity - 1)}
                  className="flex items-center justify-center w-10 h-9 transition-colors hover:bg-orange-500 hover:text-white"
                  style={{ color: "var(--color-brown-900)", borderRight: "1px solid var(--color-brown-900)" }}
                >
                  <Minus size={14} />
                </button>
                <span
                  className="font-bold text-sm flex-1 text-center"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
                >
                  {cartQuantity} in cart
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, cartQuantity + 1)}
                  className="flex items-center justify-center w-10 h-9 transition-colors hover:bg-orange-500 hover:text-white"
                  style={{ color: "var(--color-brown-900)", borderLeft: "1px solid var(--color-brown-900)" }}
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

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
