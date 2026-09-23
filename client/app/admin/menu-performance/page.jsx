"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { getUser, isAuthenticated } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import MenuItemImage from "../../components/MenuItemImage";
import AnalyticsTable from "../../components/admin/AnalyticsTable";
import ExportButton from "../../components/admin/ExportButton";
import { VegBadge, NonVegBadge } from "../../components/LoadingScreen";
import toast from "react-hot-toast";

export default function MenuPerformancePage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dietFilter, setDietFilter] = useState("ALL");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    const u = getUser();
    if (u?.role !== "ADMIN") {
      router.push("/admin/login");
    }
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/admin/analytics/menu-performance");
      setItems(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load menu performance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = items.filter((item) => {
    if (dietFilter === "VEG") return item.isVeg;
    if (dietFilter === "NON_VEG") return !item.isVeg;
    return true;
  });

  const columns = [
    {
      key: "name",
      label: "Item",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-[160px]">
          <MenuItemImage src={row.image} alt={row.name} variant="thumbnail" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {row.isVeg ? <VegBadge className="w-3 h-3" /> : <NonVegBadge className="w-3 h-3" />}
              <span className="font-bold truncate" style={{ color: "var(--color-brown-900)" }}>{row.name}</span>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-wide" style={{ color: "var(--color-text-muted)" }}>{row.category}</p>
          </div>
        </div>
      ),
    },
    { key: "orders", label: "Orders", sortable: true, align: "right" },
    {
      key: "revenue",
      label: "Revenue",
      sortable: true,
      align: "right",
      render: (row) => `₹${row.revenue.toLocaleString("en-IN")}`,
    },
    { key: "averageQuantityPerOrder", label: "Avg Qty/Order", sortable: true, align: "right" },
    {
      key: "calories",
      label: "Calories",
      sortable: true,
      align: "right",
      render: (row) => (row.calories != null ? `${row.calories} kcal` : "—"),
    },
    {
      key: "servingInformation",
      label: "Serving Info",
      render: (row) => row.servingInformation || "—",
    },
  ];

  const exportColumns = [
    { key: "name", label: "Item" },
    { key: "category", label: "Category" },
    { key: "orders", label: "Orders" },
    { key: "quantitySold", label: "Quantity Sold" },
    { key: "revenue", label: "Revenue (INR)" },
    { key: "averageQuantityPerOrder", label: "Avg Qty/Order" },
    { key: "calories", label: "Calories" },
    { key: "servingInformation", label: "Serving Info" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <Navbar title="Menu Performance" subtitle="Per-item analytics" backHref="/admin/dashboard" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
            {[
              { key: "ALL", label: "All" },
              { key: "VEG", label: "Veg" },
              { key: "NON_VEG", label: "Non-Veg" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setDietFilter(f.key)}
                className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors"
                style={{
                  background: dietFilter === f.key ? "var(--color-brown-900)" : "transparent",
                  color: dietFilter === f.key ? "white" : "var(--color-brown-900)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ExportButton
            filename="menu-performance"
            title="Menu Performance Report"
            subtitle={`Generated ${new Date().toLocaleString("en-IN")}`}
            columns={exportColumns}
            rows={filteredItems}
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />
            ))}
          </div>
        ) : (
          <AnalyticsTable
            columns={columns}
            rows={filteredItems}
            rowKey={(row) => row.id}
            searchPlaceholder="Search menu items..."
            pageSize={12}
            emptyMessage="No menu items match your filters."
          />
        )}
      </main>
    </div>
  );
}
