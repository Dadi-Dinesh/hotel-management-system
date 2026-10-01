"use client";

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
  dietFilterVisible = true,
  searchQuery,
  onSearchChange,
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

          {dietFilterVisible && (
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
          )}
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
      </div>
    </div>
  );
}
