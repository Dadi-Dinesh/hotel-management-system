"use client";

export default function CategoryTabs({ categories, activeCategory, onSelect }) {
  return (
    <div
      className="sticky top-[73px] z-40 border-b"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-brown-900)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-3 overflow-x-auto py-3 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => onSelect(null)}
            className="flex-shrink-0 px-5 py-2 text-sm font-bold uppercase tracking-widest transition-colors border"
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
              onClick={() => onSelect(cat.id)}
              className="flex-shrink-0 px-5 py-2 text-sm font-bold uppercase tracking-widest transition-colors border whitespace-nowrap"
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
