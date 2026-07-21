"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Plus, Minus, UtensilsCrossed, ShoppingCart } from "lucide-react";
import { MenuItem } from "../types";

interface FoodDetailModalProps {
  item: MenuItem;
  cartQuantity: number;
  onClose: () => void;
  onAdd: (item: MenuItem) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}

const getServingEmoji = (info: string): string => {
  if (!info) return "";
  const lower = info.toLowerCase();
  if (lower.includes("people") || lower.includes("person") || lower.includes("adult") || lower.includes("serves")) {
    return lower.includes("family") ? "👨‍👩‍👧" : "👥";
  }
  if (lower.includes("roti") || lower.includes("pulka") || lower.includes("naan") || lower.includes("paratha") || lower.includes("phulka")) {
    return "🫓";
  }
  if (lower.includes("family") || lower.includes("pack")) return "👨‍👩‍👧";
  return "🍽️";
};

export default function FoodDetailModal({
  item,
  cartQuantity,
  onClose,
  onAdd,
  onUpdateQuantity,
}: FoodDetailModalProps) {
  const [imgError, setImgError] = useState(false);
  const [visible, setVisible] = useState(false);
  const imgSrc = item.imageUrl || item.image;

  // Animate in
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Escape key closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        background: `rgba(30, 16, 4, ${visible ? 0.65 : 0})`,
        backdropFilter: visible ? "blur(3px)" : "none",
        transition: "background 0.2s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Card ── */}
      <div
        className="
          w-full
          sm:w-[420px] md:w-[460px]
          flex flex-col
          overflow-hidden
        "
        style={{
          background: "var(--color-surface)",
          border: "2px solid var(--color-brown-900)",
          maxHeight: "95dvh",
          transform: visible ? "translateY(0)" : "translateY(60px)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.3s cubic-bezier(0.34,1.2,0.64,1), opacity 0.25s ease",
        }}
      >

        {/* ── TOP BAR: category + close button ── */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            background: "var(--color-brown-900)",
            color: "var(--color-cream-50)",
          }}
        >
          <span className="text-xs font-bold uppercase tracking-widest">
            {item.category?.name || "Menu Item"}
          </span>

          {/* Close button — always visible in the top bar */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 transition-colors"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "var(--color-cream-50)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
            aria-label="Close"
          >
            <X size={13} />
            CLOSE
          </button>
        </div>

        {/* ── FOOD IMAGE ── */}
        <div
          className="relative w-full flex-shrink-0"
          style={{
            aspectRatio: "16/9",
            background: "var(--color-cream-200)",
          }}
        >
          {imgSrc && !imgError ? (
            <Image
              src={imgSrc}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, 460px"
              className="object-cover"
              priority
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UtensilsCrossed
                size={52}
                style={{ color: "var(--color-brown-800)", opacity: 0.2 }}
              />
            </div>
          )}
        </div>

        {/* ── DETAILS (scrollable if content overflows) ── */}
        <div className="flex flex-col overflow-y-auto flex-1">

          {/* Name + price row */}
          <div
            className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 border-b"
            style={{ borderColor: "var(--color-cream-300)" }}
          >
            <h2
              className="font-black uppercase tracking-wide leading-tight flex-1"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-brown-900)",
                fontSize: "clamp(1rem, 4vw, 1.3rem)",
              }}
            >
              {item.name}
            </h2>
            <span
              className="font-black flex-shrink-0"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-orange-500)",
                fontSize: "clamp(1.1rem, 4vw, 1.5rem)",
              }}
            >
              ₹{item.price}
            </span>
          </div>

          {/* Rating + spice level bar */}
          <div
            className="px-5 py-2.5 flex items-center justify-between border-b bg-cream-50"
            style={{ borderColor: "var(--color-cream-300)" }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
              <span className="text-amber-500 text-sm">
                {"★".repeat(Math.floor(item.displayRating || item.rating || 4.2))}
                {(item.displayRating || item.rating || 4.2) % 1 >= 0.5 ? "★" : ""}
                {"☆".repeat(5 - Math.floor(item.displayRating || item.rating || 4.2) - ((item.displayRating || item.rating || 4.2) % 1 >= 0.5 ? 1 : 0))}
              </span>
              <span className="font-bold text-brown-900">
                {(item.displayRating || item.rating || 4.2).toFixed(1)}
              </span>
              <span className="text-[11px] font-normal text-gray-500">
                ({item.ratingCount || 100} Reviews)
              </span>
            </div>

            {item.spiceLevel && (
              <span className="text-xs font-semibold text-orange-600">
                🌶️ {item.spiceLevel}
              </span>
            )}
          </div>

          {/* Serving info + calories */}
          {(item.servingInformation || item.calories != null) && (
            <div
              className="px-5 py-3 flex flex-wrap gap-3 border-b"
              style={{ borderColor: "var(--color-cream-300)" }}
            >
              {item.servingInformation && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
                  style={{
                    background: "var(--color-cream-100)",
                    color: "var(--color-brown-800)",
                    border: "1px solid var(--color-cream-300)",
                  }}
                >
                  {getServingEmoji(item.servingInformation)} {item.servingInformation}
                </span>
              )}
              {item.calories != null && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1.5"
                  style={{
                    background: "var(--color-cream-100)",
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-cream-300)",
                  }}
                >
                  🔥 {item.calories} kcal
                </span>
              )}
            </div>
          )}

          {/* Description — only if exists */}
          {item.description && (
            <div
              className="px-5 py-4 border-b"
              style={{ borderColor: "var(--color-cream-300)" }}
            >
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {item.description}
              </p>
            </div>
          )}

          {/* ADD / qty controls */}
          <div className="px-5 py-4">
            {cartQuantity === 0 ? (
              <button
                onClick={() => { onAdd(item); onClose(); }}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-bold uppercase tracking-wider"
              >
                <ShoppingCart size={16} />
                Add to Order
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  In cart: {cartQuantity}
                </span>
                <div
                  className="flex items-center border"
                  style={{ borderColor: "var(--color-brown-900)" }}
                >
                  <button
                    onClick={() => onUpdateQuantity(item.id, cartQuantity - 1)}
                    className="flex items-center justify-center w-10 h-10 transition-colors hover:bg-orange-500 hover:text-white"
                    style={{ color: "var(--color-brown-900)", borderRight: "1px solid var(--color-brown-900)" }}
                  >
                    <Minus size={15} />
                  </button>
                  <span
                    className="font-bold text-base min-w-[40px] text-center"
                    style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
                  >
                    {cartQuantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, cartQuantity + 1)}
                    className="flex items-center justify-center w-10 h-10 transition-colors hover:bg-orange-500 hover:text-white"
                    style={{ color: "var(--color-brown-900)", borderLeft: "1px solid var(--color-brown-900)" }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
