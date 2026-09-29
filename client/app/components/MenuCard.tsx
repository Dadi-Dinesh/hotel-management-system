"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Plus } from "lucide-react";
import MenuItemImage from "./MenuItemImage";
import FoodDetailModal from "./FoodDetailModal";
import QuantitySelector from "./customer/QuantitySelector";
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

export default function MenuCard({
  item,
  cartQuantity = 0,
  onAdd,
  onUpdateQuantity,
}: MenuCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [inputString, setInputString] = useState<string>(cartQuantity > 0 ? String(cartQuantity) : "");
  const shouldReduceMotion = useReducedMotion();

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
        whileHover={shouldReduceMotion ? undefined : { y: -3 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col w-full max-w-full overflow-hidden rounded-[var(--ss-radius-card)]"
        style={{
          border: "1px solid var(--ss-border)",
          background: "var(--ss-surface)",
          boxShadow: "var(--ss-shadow-sm)",
        }}
      >
        {/* Image with overlay badges */}
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
              className="absolute top-2.5 right-2.5 z-10 ss-caption font-bold px-2 py-1 rounded-full"
              style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)" }}
            >
              🔥 Popular
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-3.5 gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-bold text-sm leading-snug cursor-pointer"
              style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}
              onClick={() => setShowDetail(true)}
            >
              {item.name}
            </h3>
            <span
              className="font-bold text-sm flex-shrink-0"
              style={{ fontFamily: "var(--font-heading)", color: "var(--ss-accent-dark)" }}
            >
              ₹{item.price}
            </span>
          </div>

          {item.description && (
            <p className="ss-caption line-clamp-1" style={{ color: "var(--ss-secondary)" }}>
              {item.description}
            </p>
          )}

          {(item.servingInformation || item.spiceLevel) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.servingInformation && (
                <span
                  className="inline-flex items-center gap-1 ss-caption font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--ss-bg)", color: "var(--ss-secondary)" }}
                >
                  {getServingEmoji(item.servingInformation)} {item.servingInformation}
                </span>
              )}
              {item.spiceLevel && (
                <span className="inline-flex items-center gap-0.5 ss-caption font-semibold" style={{ color: "var(--ss-accent-dark)" }}>
                  🌶️ {item.spiceLevel}
                </span>
              )}
            </div>
          )}

          {/* Add / quantity controls */}
          <div className="mt-auto pt-2">
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
                  className="ss-input w-16 h-9 text-center font-bold text-sm"
                  style={{
                    background: "var(--ss-bg)",
                    border: "1px solid var(--ss-border)",
                    borderRadius: "var(--ss-radius-input)",
                    color: "var(--ss-primary)",
                  }}
                  aria-label={`Quantity for ${item.name}`}
                />
                <motion.button
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                  type="button"
                  onClick={handleApplyQuantity}
                  className="ss-btn flex-1 h-9 font-semibold text-xs flex items-center justify-center gap-1"
                  data-variant="primary"
                  style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
                >
                  <Plus size={13} /> Add
                </motion.button>
              </div>
            ) : (
              <QuantitySelector
                quantity={cartQuantity}
                onAdd={() => onAdd(item)}
                onIncrement={() => onUpdateQuantity(item.id, cartQuantity + 1)}
                onDecrement={() => onUpdateQuantity(item.id, cartQuantity - 1)}
                addLabel="Add to Cart"
                size="md"
                fullWidthAdd
              />
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
