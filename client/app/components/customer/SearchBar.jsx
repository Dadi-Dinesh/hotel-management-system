"use client";

import { forwardRef } from "react";
import { Search, X } from "lucide-react";

/** Live-filtering search input with a clear button. No backend calls —
 * filtering happens client-side against the already-loaded menu. */
const SearchBar = forwardRef(function SearchBar(
  { value, onChange, placeholder = "Search dishes, categories...", autoFocus = false, className = "" },
  ref
) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "var(--ss-secondary)" }}
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Search menu"
        className="ss-input ss-small w-full h-11 pl-11 pr-10 font-medium"
        style={{
          background: "var(--ss-bg)",
          border: "1px solid var(--ss-border)",
          borderRadius: "var(--ss-radius-input)",
          color: "var(--ss-primary)",
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full"
          style={{ background: "var(--ss-border)", color: "var(--ss-primary)" }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
});

export default SearchBar;
