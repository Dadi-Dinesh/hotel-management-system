"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

export interface AnalyticsColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  searchValue?: (row: T) => string;
}

interface AnalyticsTableProps<T> {
  columns: AnalyticsColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  filters?: React.ReactNode;
  emptyMessage?: string;
}

export default function AnalyticsTable<T>({
  columns,
  rows,
  rowKey,
  searchPlaceholder = "Search...",
  pageSize = 10,
  filters,
  emptyMessage = "No results found.",
}: AnalyticsTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const searchedRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = col.searchValue ? col.searchValue(row) : String((row as any)[col.key] ?? "");
        return val.toLowerCase().includes(q);
      })
    );
  }, [rows, search, columns]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return searchedRows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return searchedRows;
    const getVal = col.sortValue || ((row: T) => (row as any)[col.key]);
    return [...searchedRows].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [searchedRows, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:ring-1 focus:ring-orange-500"
            style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-100)", color: "var(--color-brown-900)" }}
          />
        </div>
        {filters}
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-border-light)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--color-brown-900)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 font-bold uppercase tracking-wide text-white whitespace-nowrap ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  } ${col.sortable ? "cursor-pointer select-none hover:opacity-80" : ""}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable &&
                      (sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ArrowUp size={11} />
                        ) : (
                          <ArrowDown size={11} />
                        )
                      ) : (
                        <ArrowUpDown size={11} className="opacity-40" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 font-bold" style={{ color: "var(--color-text-muted)" }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  className="border-t"
                  style={{ borderColor: "var(--color-border-light)", background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-cream-50, transparent)" }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
          <span>
            Page {clampedPage} of {totalPages} · {sortedRows.length} results
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={clampedPage === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-30"
              style={{ borderColor: "var(--color-border-light)" }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={clampedPage === totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-30"
              style={{ borderColor: "var(--color-border-light)" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
