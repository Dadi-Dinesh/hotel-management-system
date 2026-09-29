"use client";

import { ArrowDownAZ, Flame, Sparkles } from "lucide-react";
import { VegBadge, NonVegBadge } from "./LoadingScreen";
import SearchBar from "./customer/SearchBar";
import CategoryPill from "./customer/CategoryPill";
import { CategoryPillSkeleton } from "./customer/SkeletonCard";

export default function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
  dietFilter = "ALL",
  onDietChange,
  searchQuery,
  onSearchChange,
  popularOnly = false,
  onPopularChange,
  newOnly = false,
  onNewChange,
  sortBy = "NONE",
  onSortChange,
  loading = false,
  searchInputRef,
}) {
  return (
    <div
      className="sticky top-14 sm:top-16 z-30 backdrop-blur-md border-b w-full"
      style={{ background: "rgba(255, 253, 248, 0.92)", borderColor: "var(--ss-border)" }}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 flex flex-col gap-2.5">
        {/* Search + diet segmented control */}
        <div className="flex items-center gap-2 w-full min-w-0">
          <SearchBar ref={searchInputRef} value={searchQuery} onChange={onSearchChange} className="flex-1 min-w-0" />

          <div
            className="flex items-center p-1 rounded-full flex-shrink-0"
            style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)" }}
          >
            <button
              type="button"
              onClick={() => onDietChange("ALL")}
              className="px-2.5 py-1.5 rounded-full ss-caption font-bold transition-all"
              style={{
                background: dietFilter === "ALL" ? "var(--ss-primary)" : "transparent",
                color: dietFilter === "ALL" ? "var(--ss-on-accent)" : "var(--ss-secondary)",
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onDietChange("VEG")}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full ss-caption font-bold transition-all"
              style={{
                background: dietFilter === "VEG" ? "var(--ss-success)" : "transparent",
                color: dietFilter === "VEG" ? "#fff" : "var(--ss-secondary)",
              }}
            >
              <VegBadge className="w-3 h-3" /> Veg
            </button>
            <button
              type="button"
              onClick={() => onDietChange("NON_VEG")}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full ss-caption font-bold transition-all"
              style={{
                background: dietFilter === "NON_VEG" ? "var(--ss-accent-dark)" : "transparent",
                color: dietFilter === "NON_VEG" ? "#fff" : "var(--ss-secondary)",
              }}
            >
              <NonVegBadge className="w-3 h-3" /> Non-Veg
            </button>
          </div>
        </div>

        {/* Category pills — horizontal scroll */}
        <div
          className="flex gap-2 overflow-x-auto py-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          {loading ? (
            <CategoryPillSkeleton />
          ) : (
            <>
              <CategoryPill active={!activeCategory} onClick={() => onSelect(null)}>
                All
              </CategoryPill>
              {categories.map((cat) => (
                <CategoryPill key={cat.id} active={activeCategory === cat.id} onClick={() => onSelect(cat.id)}>
                  {cat.name}
                </CategoryPill>
              ))}
            </>
          )}
        </div>

        {/* Popular / New / Sort */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <CategoryPill active={popularOnly} onClick={() => onPopularChange?.(!popularOnly)} icon={Flame}>
            Popular
          </CategoryPill>
          <CategoryPill active={newOnly} onClick={() => onNewChange?.(!newOnly)} icon={Sparkles}>
            New
          </CategoryPill>

          <div className="flex-1 min-w-[8px]" />

          <div className="flex-shrink-0 relative flex items-center">
            <ArrowDownAZ size={12} className="absolute left-3 pointer-events-none" style={{ color: "var(--ss-secondary)" }} />
            <select
              value={sortBy}
              onChange={(e) => onSortChange?.(e.target.value)}
              aria-label="Sort menu items"
              className="pl-7 pr-3 py-1.5 rounded-full ss-caption font-bold appearance-none focus:outline-none"
              style={{
                background: sortBy !== "NONE" ? "var(--ss-accent)" : "var(--ss-surface)",
                color: sortBy !== "NONE" ? "var(--ss-on-accent)" : "var(--ss-secondary)",
                border: `1px solid ${sortBy !== "NONE" ? "var(--ss-accent)" : "var(--ss-border)"}`,
              }}
            >
              <option value="NONE">Sort</option>
              <option value="PRICE_LOW">Price: Low to High</option>
              <option value="PRICE_HIGH">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
