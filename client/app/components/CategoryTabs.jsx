"use client";
import SearchBar from "./customer/SearchBar";
import CategoryPill from "./customer/CategoryPill";
export default function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
  dietFilter = "ALL",
  onDietChange,
  dietFilterVisible = true,
  searchQuery,
  onSearchChange,
  searchInputRef,
}) {
  return (
    <section
      aria-label="Find menu items"
      className="max-w-[1100px] mx-auto w-full px-4 pt-4 space-y-3"
    >
      <SearchBar
        ref={searchInputRef}
        value={searchQuery}
        onChange={onSearchChange}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm font-semibold flex flex-col gap-1">
          Category
          <select
            aria-label="Menu category"
            value={activeCategory || ""}
            onChange={(e) => onSelect(e.target.value || null)}
            className="w-full min-h-11 rounded-xl border p-2"
            style={{
              background: "var(--ss-surface)",
              borderColor: "var(--ss-border)",
            }}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
        {dietFilterVisible && (
          <div
            role="group"
            aria-label="Food preference"
            className="flex flex-wrap gap-2 items-end"
          >
            {[
              ["ALL", "All food"],
              ["VEG", "Veg"],
              ["NON_VEG", "Non-veg"],
            ].map(([value, label]) => (
              <CategoryPill
                key={value}
                active={dietFilter === value}
                onClick={() => onDietChange(value)}
              >
                {label}
              </CategoryPill>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
