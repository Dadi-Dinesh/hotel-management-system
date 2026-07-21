"use client";

import { Search, X } from "lucide-react";
import { VegBadge, NonVegBadge } from "./LoadingScreen";

export default function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
  dietFilter = "ALL",
  onDietChange,
  searchQuery,
  onSearchChange,
}) {
  return (
    <div
      className="sticky top-[53px] sm:top-[61px] z-40 border-b w-full shadow-xs backdrop-blur-md"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-brown-900)",
      }}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 flex flex-col gap-2">
        {/* Single Line Row: Search Input (Left) + Compact Diet Segmented Control (Right) */}
        <div className="flex items-center gap-2 w-full min-w-0">
          {/* Search Input (Takes available space) */}
          <div className="relative flex-1 min-w-0">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search dishes..."
              className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold rounded-full border focus:outline-none focus:ring-1 focus:ring-orange-500 truncate"
              style={{
                background: "var(--color-cream-100)",
                color: "var(--color-brown-900)",
                borderColor: "var(--color-brown-900)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-500"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Compact Diet Segmented Control (Always side-by-side) */}
          <div
            className="flex items-center p-0.5 rounded-full border flex-shrink-0"
            style={{
              background: "var(--color-cream-100)",
              borderColor: "var(--color-brown-900)",
            }}
          >
            <button
              type="button"
              onClick={() => onDietChange("ALL")}
              className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                dietFilter === "ALL"
                  ? "bg-brown-900 text-white shadow-xs"
                  : "text-brown-900 hover:text-orange-600"
              }`}
              style={{
                background: dietFilter === "ALL" ? "var(--color-brown-900)" : "transparent",
                color: dietFilter === "ALL" ? "white" : "var(--color-brown-900)",
              }}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => onDietChange("VEG")}
              className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                dietFilter === "VEG"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-emerald-800 hover:bg-emerald-100/50"
              }`}
            >
              <VegBadge className="w-3 h-3" /> Veg
            </button>

            <button
              type="button"
              onClick={() => onDietChange("NON_VEG")}
              className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                dietFilter === "NON_VEG"
                  ? "bg-amber-900 text-white shadow-xs"
                  : "text-amber-900 hover:bg-amber-100/50"
              }`}
            >
              <NonVegBadge className="w-3 h-3" /> Non-Veg
            </button>
          </div>
        </div>

        {/* Bottom Row: Horizontal Category Carousel */}
        <div
          className="flex gap-1.5 sm:gap-2 overflow-x-auto py-0.5 scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all border"
            style={{
              fontFamily: "var(--font-heading)",
              background: !activeCategory ? "var(--color-orange-500)" : "transparent",
              color: !activeCategory ? "#FFFDF7" : "var(--color-brown-900)",
              borderColor: "var(--color-brown-900)",
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap"
              style={{
                fontFamily: "var(--font-heading)",
                background: activeCategory === cat.id ? "var(--color-orange-500)" : "transparent",
                color: activeCategory === cat.id ? "#FFFDF7" : "var(--color-brown-900)",
                borderColor: "var(--color-brown-900)",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
