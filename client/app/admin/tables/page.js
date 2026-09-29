"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  Plus,
  Edit,
  Trash2,
  Users,
  Check,
  RefreshCcw,
  AlertTriangle,
  Receipt,
  LogOut,
  Sliders,
  BarChart3,
  Clock,
  IndianRupee,
  QrCode,
} from "lucide-react";
import api from "../../lib/api";
import { getUser, clearAuth, isAuthenticated, getEffectiveRestaurantId } from "../../lib/auth";
import { useSocket } from "../../components/SocketProvider";
import DashboardHeader from "../../components/admin/DashboardHeader";
import Modal from "../../components/ui/Modal";
import ExportButton from "../../components/admin/ExportButton";
import { TableCardSkeleton } from "../../components/admin/AdminSkeletons";
import { useRestaurant } from "../../components/RestaurantContext";
import { DEMO_RESTAURANT } from "../../lib/branding";
import EmptyState from "../../components/EmptyState";
import { generateTablePostersPDF } from "../../lib/posterUtils";
import toast from "react-hot-toast";

export default function AdminTablesPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const { restaurant: activeRestaurant } = useRestaurant();

  const [user, setUser] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPosters, setGeneratingPosters] = useState(false);

  // Filter
  const [filter, setFilter] = useState("all"); // "all", "occupied", "available", "disabled"

  // Analytics tab (additive — "Manage" tab below is completely unchanged)
  const [viewMode, setViewMode] = useState("manage"); // "manage" | "analytics"
  const [tableAnalytics, setTableAnalytics] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  // Modal state (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null); // null for create, table object for edit
  const [formData, setFormData] = useState({
    code: "",
    number: "",
    capacity: 4,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deletingTable, setDeletingTable] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    const u = getUser();
    if (u?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    setUser(u);
    fetchTables();
  }, [router]);

  const fetchTables = useCallback(async () => {
    try {
      const res = await api.get("/tables");
      setTables(res.data.data);
    } catch (error) {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTableAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get("/admin/analytics/tables");
      setTableAnalytics(res.data.data || []);
      setAnalyticsLoaded(true);
    } catch (error) {
      toast.error("Failed to load table analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Lazy-load analytics only the first time that tab is opened.
  useEffect(() => {
    if (viewMode === "analytics" && !analyticsLoaded) {
      fetchTableAnalytics();
    }
  }, [viewMode, analyticsLoaded, fetchTableAnalytics]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket) return;
    socket.emit("join-admin", { restaurantId: getEffectiveRestaurantId() });

    socket.on("table-updated", () => {
      fetchTables();
    });
    socket.on("new-session", () => {
      fetchTables();
    });
    socket.on("bill-requested", () => {
      fetchTables();
    });
    socket.on("session-closed", () => {
      fetchTables();
    });

    return () => {
      socket.off("table-updated");
      socket.off("new-session");
      socket.off("bill-requested");
      socket.off("session-closed");
    };
  }, [socket, fetchTables]);

  const handleOpenCreateModal = () => {
    setEditingTable(null);

    // Auto-suggest next table number & code
    let nextNum = 1;
    if (tables.length > 0) {
      const maxNum = Math.max(...tables.map((t) => t.number || 0));
      nextNum = maxNum + 1;
    }

    setFormData({
      code: `T${String(nextNum).padStart(2, "0")}`,
      number: String(nextNum),
      capacity: 4,
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (table) => {
    setEditingTable(table);
    setFormData({
      code: table.code,
      number: String(table.number),
      capacity: table.capacity || 4,
      isActive: table.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingTable) {
        // Edit existing table
        await api.patch(`/tables/${editingTable.id}`, {
          code: formData.code,
          number: parseInt(formData.number, 10),
          capacity: parseInt(formData.capacity, 10),
          isActive: formData.isActive,
        });
        toast.success(`Table ${formData.code} updated successfully!`);
      } else {
        // Create new table
        await api.post("/tables", {
          code: formData.code,
          number: parseInt(formData.number, 10),
          capacity: parseInt(formData.capacity, 10),
          isActive: formData.isActive,
        });
        toast.success(`Table ${formData.code} created successfully!`);
      }

      setModalOpen(false);
      fetchTables();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save table");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (table) => {
    try {
      await api.patch(`/tables/${table.id}`, {
        isActive: !table.isActive,
      });
      toast.success(`Table ${table.code} ${!table.isActive ? "enabled" : "disabled"}`);
      fetchTables();
    } catch (error) {
      toast.error("Failed to toggle table status");
    }
  };

  const handleDeleteTable = async () => {
    if (!deletingTable) return;
    setDeleting(true);

    try {
      await api.delete(`/tables/${deletingTable.id}`);
      toast.success(`Table ${deletingTable.code} deleted successfully.`);
      setDeletingTable(null);
      fetchTables();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete table");
    } finally {
      setDeleting(false);
    }
  };

  const handleGeneratePosters = async () => {
    const activeTables = tables.filter((t) => t.isActive);
    if (activeTables.length === 0) {
      toast.error("No active tables to generate QR codes for.");
      return;
    }
    setGeneratingPosters(true);
    try {
      const restaurant = activeRestaurant || DEMO_RESTAURANT;
      await generateTablePostersPDF({ restaurant, tables: activeTables });
      toast.success(`Generated ${activeTables.length} table QR poster${activeTables.length > 1 ? "s" : ""}.`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate QR posters.");
    } finally {
      setGeneratingPosters(false);
    }
  };

  // Seating calculations
  let totalCapacity = 0;
  let occupiedSeats = 0;
  let freeSeats = 0;
  let occupiedTablesCount = 0;
  let availableTablesCount = 0;
  let disabledTablesCount = 0;

  tables.forEach((t) => {
    const cap = t.capacity || 4;
    if (!t.isActive) {
      disabledTablesCount++;
    } else if (t.activeSession) {
      occupiedTablesCount++;
      occupiedSeats += cap;
      totalCapacity += cap;
    } else {
      availableTablesCount++;
      freeSeats += cap;
      totalCapacity += cap;
    }
  });

  const filteredTables = tables.filter((t) => {
    if (filter === "occupied") return t.isActive && !!t.activeSession;
    if (filter === "available") return t.isActive && !t.activeSession;
    if (filter === "disabled") return !t.isActive;
    return true;
  });

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <DashboardHeader
        title="Tables"
        subtitle="Live seating & table controls"
        actions={
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={fetchTables}
              aria-label="Refresh"
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "var(--ss-bg)", color: "var(--ss-primary)" }}
            >
              <RefreshCcw size={15} />
            </button>
            <button
              onClick={handleGeneratePosters}
              disabled={generatingPosters}
              className="ss-btn flex items-center gap-1.5 ss-caption font-bold py-2 px-3.5 disabled:opacity-50"
              data-variant="secondary"
              style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", borderRadius: "var(--ss-radius-button)" }}
              title="Quick download — a print-ready QR poster PDF for every active table"
            >
              <QrCode size={14} /> {generatingPosters ? "Generating..." : "QR PDF"}
            </button>
            <Link
              href="/admin/qr-codes"
              className="ss-btn flex items-center gap-1.5 ss-caption font-bold py-2 px-3.5"
              data-variant="secondary"
              style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", borderRadius: "var(--ss-radius-button)" }}
            >
              <QrCode size={14} /> Manage QR
            </Link>
            <button
              onClick={handleOpenCreateModal}
              className="ss-btn flex items-center gap-1.5 ss-caption font-bold py-2 px-3.5"
              data-variant="primary"
              style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
            >
              <Plus size={14} /> Add Table
            </button>
          </div>
        }
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Mobile-only action row (DashboardHeader hides `actions` below md) */}
        <div className="flex md:hidden items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={handleOpenCreateModal}
            className="ss-btn flex items-center gap-1.5 ss-caption font-bold py-2 px-3.5"
            style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
          >
            <Plus size={14} /> Add Table
          </button>
          <Link
            href="/admin/qr-codes"
            className="ss-btn flex items-center gap-1.5 ss-caption font-bold py-2 px-3.5"
            style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", borderRadius: "var(--ss-radius-button)" }}
          >
            <QrCode size={14} /> Manage QR
          </Link>
        </div>

        {/* Manage / Analytics Tab Switcher */}
        <div className="inline-flex items-center gap-0.5 p-1 rounded-full mb-6" style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)" }}>
          <button
            onClick={() => setViewMode("manage")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full ss-caption font-bold transition-colors"
            style={{
              background: viewMode === "manage" ? "var(--ss-primary)" : "transparent",
              color: viewMode === "manage" ? "var(--ss-on-accent)" : "var(--ss-secondary)",
            }}
          >
            <Sliders size={13} /> Manage
          </button>
          <button
            onClick={() => setViewMode("analytics")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full ss-caption font-bold transition-colors"
            style={{
              background: viewMode === "analytics" ? "var(--ss-primary)" : "transparent",
              color: viewMode === "analytics" ? "var(--ss-on-accent)" : "var(--ss-secondary)",
            }}
          >
            <BarChart3 size={13} /> Analytics
          </button>
        </div>

        {viewMode === "analytics" ? (
          <div>
            <div className="flex items-center justify-end mb-4">
              <ExportButton
                filename="table-analytics"
                title="Table Analytics Report"
                subtitle={`Generated ${new Date().toLocaleString("en-IN")}`}
                columns={[
                  { key: "code", label: "Table" },
                  { key: "totalSessions", label: "Total Sessions" },
                  { key: "revenue", label: "Revenue (INR)" },
                  { key: "averageStayMinutes", label: "Avg Stay (min)" },
                  { key: "ordersCount", label: "Orders" },
                  { key: "lastUsed", label: "Last Used", value: (r) => (r.lastUsed ? new Date(r.lastUsed).toLocaleString("en-IN") : "Never") },
                  { key: "occupancyRatePercent", label: "Occupancy Rate (%)" },
                ]}
                rows={tableAnalytics}
              />
            </div>
            {analyticsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tableAnalytics.map((t) => (
                  <div key={t.id} className="rounded-2xl p-4 border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                        {t.code}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "var(--color-cream-100)", color: "var(--color-text-muted)" }}>
                        {t.occupancyRatePercent}% occupied
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><IndianRupee size={11} /> Revenue</span>
                        <span className="font-black" style={{ color: "var(--color-brown-900)" }}>₹{t.revenue.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sessions</span>
                        <span className="font-bold">{t.totalSessions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Orders</span>
                        <span className="font-bold">{t.ordersCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><Clock size={11} /> Avg Stay</span>
                        <span className="font-bold">{t.averageStayMinutes}m</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Last Used</span>
                        <span className="font-bold">{t.lastUsed ? new Date(t.lastUsed).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Never"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
        {/* Seating Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Capacity */}
          <div className="rounded-[var(--ss-radius-card)] p-4" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="ss-caption font-bold">Total Capacity</span>
              <Users size={16} style={{ color: "var(--ss-secondary)" }} />
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>{totalCapacity}</p>
            <p className="ss-caption mt-1">Across {availableTablesCount + occupiedTablesCount} active tables</p>
          </div>

          {/* Occupied Seats */}
          <div className="rounded-[var(--ss-radius-card)] p-4" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-accent-tint)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="ss-caption font-bold" style={{ color: "var(--ss-accent-dark)" }}>Occupied Seats</span>
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "var(--ss-accent)" }} />
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-accent-dark)" }}>{occupiedSeats}</p>
            <p className="ss-caption mt-1" style={{ color: "var(--ss-accent-dark)" }}>{occupiedTablesCount} tables occupied</p>
          </div>

          {/* Free Seats */}
          <div className="rounded-[var(--ss-radius-card)] p-4" style={{ border: "1px solid var(--ss-border)", background: "rgba(27,138,90,0.08)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="ss-caption font-bold" style={{ color: "var(--ss-success)" }}>Free Seats</span>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--ss-success)" }} />
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-success)" }}>{freeSeats}</p>
            <p className="ss-caption mt-1" style={{ color: "var(--ss-success)" }}>{availableTablesCount} tables available</p>
          </div>

          {/* Occupation Percentage */}
          <div className="rounded-[var(--ss-radius-card)] p-4" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="ss-caption font-bold">Occupancy Rate</span>
              <Sliders size={16} style={{ color: "var(--ss-secondary)" }} />
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
              {totalCapacity > 0 ? Math.round((occupiedSeats / totalCapacity) * 100) : 0}%
            </p>
            <div className="w-full h-1.5 mt-2 rounded-full overflow-hidden" style={{ background: "var(--ss-border)" }}>
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{ width: `${totalCapacity > 0 ? (occupiedSeats / totalCapacity) * 100 : 0}%`, background: "var(--ss-accent)" }}
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b" style={{ borderColor: "var(--ss-border)" }}>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: `All (${tables.length})` },
              { id: "occupied", label: `Occupied (${occupiedTablesCount})` },
              { id: "available", label: `Available (${availableTablesCount})` },
              { id: "disabled", label: `Disabled (${disabledTablesCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className="ss-caption font-bold px-3.5 py-2 rounded-full transition-all"
                style={{
                  background: filter === tab.id ? "var(--ss-primary)" : "var(--ss-surface)",
                  color: filter === tab.id ? "var(--ss-on-accent)" : "var(--ss-secondary)",
                  border: "1px solid var(--ss-border)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="ss-caption font-semibold">
            Showing {filteredTables.length} of {tables.length} tables
          </span>
        </div>

        {/* Tables Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <TableCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed size={28} style={{ color: "var(--ss-secondary)" }} />}
            title={tables.length === 0 ? "No tables yet" : "No tables match"}
            description={tables.length === 0 ? "Add your first table to start generating QR codes for customers to scan." : "Try a different filter to see more tables."}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTables.map((table) => {
              const isOccupied = table.isActive && !!table.activeSession;
              const isBillRequested = isOccupied && table.activeSession.status === "BILL_REQUESTED";

              // Calculate session total if occupied
              let runningTotal = 0;
              if (isOccupied && table.activeSession.orders) {
                table.activeSession.orders.forEach((o) => {
                  if (o.status !== "CANCELLED") {
                    o.items.forEach((item) => {
                      runningTotal += item.price * item.quantity;
                    });
                  }
                });
              }

              const tone = !table.isActive
                ? { border: "var(--ss-border)", bg: "var(--ss-bg)" }
                : isBillRequested
                ? { border: "rgba(217,140,0,0.4)", bg: "rgba(217,140,0,0.08)" }
                : isOccupied
                ? { border: "rgba(232,144,23,0.4)", bg: "var(--ss-accent-tint)" }
                : { border: "var(--ss-border)", bg: "var(--ss-surface)" };

              return (
                <div
                  key={table.id}
                  className={`rounded-[var(--ss-radius-card)] p-4 flex flex-col justify-between transition-all ${!table.isActive ? "opacity-70" : ""}`}
                  style={{ border: `1px solid ${tone.border}`, background: tone.bg, boxShadow: "var(--ss-shadow-sm)" }}
                >
                  {/* Top Bar: Table Code, QR shortcut & Status Badge */}
                  <div>
                    <div className="flex items-start justify-between mb-3 pb-3 border-b" style={{ borderColor: "var(--ss-border)" }}>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
                            {table.code}
                          </span>
                          <span className="ss-caption font-semibold">#{table.number}</span>
                        </div>
                        <span className="ss-caption font-semibold">👥 {table.capacity || 4} Seats</span>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <Link
                          href="/admin/qr-codes"
                          aria-label={`QR code for table ${table.code}`}
                          title="View / print this table's QR"
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-secondary)" }}
                        >
                          <QrCode size={13} />
                        </Link>
                        {!table.isActive ? (
                          <span className="ss-caption font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--ss-border)", color: "var(--ss-secondary)" }}>
                            Disabled
                          </span>
                        ) : isBillRequested ? (
                          <span className="ss-caption font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse" style={{ background: "var(--ss-warning)", color: "var(--ss-primary)" }}>
                            <Receipt size={10} /> Bill
                          </span>
                        ) : isOccupied ? (
                          <span className="ss-caption font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)" }}>
                            Occupied
                          </span>
                        ) : (
                          <span className="ss-caption font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--ss-success)", color: "#fff" }}>
                            Free
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Session info if occupied */}
                    {isOccupied && (
                      <div className="mb-4 p-2.5 rounded-xl space-y-1 ss-caption font-semibold" style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)" }}>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--ss-secondary)" }}>Running Total:</span>
                          <span className="font-bold" style={{ color: "var(--ss-accent-dark)" }}>₹{runningTotal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--ss-secondary)" }}>Orders:</span>
                          <span style={{ color: "var(--ss-primary)" }}>{table.activeSession.orders?.length || 0} placed</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex items-center justify-between pt-3 border-t mt-2" style={{ borderColor: "var(--ss-border)" }}>
                    <button
                      onClick={() => handleToggleActive(table)}
                      className="ss-caption font-bold px-2.5 py-1.5 rounded-full transition-colors"
                      style={{
                        border: `1px solid ${table.isActive ? "var(--ss-danger)" : "var(--ss-success)"}`,
                        color: table.isActive ? "var(--ss-danger)" : "var(--ss-success)",
                      }}
                      title={table.isActive ? "Disable table" : "Enable table"}
                    >
                      {table.isActive ? "Disable" : "Enable"}
                    </button>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(table)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)" }}
                        title="Edit capacity & details"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingTable(table)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-danger)" }}
                        title="Delete table"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        )}
      </main>

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingTable ? `Edit Table ${editingTable.code}` : "Add New Table"}>
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div>
            <label className="ss-caption font-bold block mb-1.5" style={{ color: "var(--ss-primary)" }}>
              Table Code (QR Identifier)
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. T01"
              className="ss-input w-full h-11 px-4 ss-body font-semibold uppercase"
              style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)", borderRadius: "var(--ss-radius-input)", color: "var(--ss-primary)" }}
            />
          </div>

          <div>
            <label className="ss-caption font-bold block mb-1.5" style={{ color: "var(--ss-primary)" }}>
              Table Number
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              placeholder="e.g. 1"
              className="ss-input w-full h-11 px-4 ss-body font-semibold"
              style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)", borderRadius: "var(--ss-radius-input)", color: "var(--ss-primary)" }}
            />
          </div>

          <div>
            <label className="ss-caption font-bold block mb-1.5" style={{ color: "var(--ss-primary)" }}>
              Seating Capacity (Number of Seats)
            </label>
            <input
              type="number"
              required
              min="1"
              max="30"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="e.g. 4"
              className="ss-input w-full h-11 px-4 ss-body font-semibold"
              style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)", borderRadius: "var(--ss-radius-input)", color: "var(--ss-primary)" }}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer"
              style={{ accentColor: "var(--ss-accent)" }}
            />
            <label htmlFor="isActiveToggle" className="ss-small font-semibold cursor-pointer" style={{ color: "var(--ss-primary)" }}>
              Table active (available for dining)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-2" style={{ borderColor: "var(--ss-border)" }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="ss-btn py-2.5 px-4 ss-caption font-bold"
              style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", borderRadius: "var(--ss-radius-button)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ss-btn py-2.5 px-6 ss-caption font-bold disabled:opacity-60"
              style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
            >
              {submitting ? "Saving..." : editingTable ? "Update Table" : "Create Table"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={Boolean(deletingTable)} onClose={() => setDeletingTable(null)} maxWidth="max-w-sm">
        {deletingTable && (
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4" style={{ color: "var(--ss-danger)" }}>
              <AlertTriangle size={26} />
              <h3 className="ss-h3" style={{ marginBottom: 0, color: "var(--ss-danger)" }}>
                Delete Table {deletingTable.code}?
              </h3>
            </div>
            <p className="ss-small mb-6 leading-relaxed">
              Are you sure you want to delete Table <strong style={{ color: "var(--ss-primary)" }}>{deletingTable.code}</strong> (Table #{deletingTable.number}, {deletingTable.capacity || 4} Seats)? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingTable(null)}
                className="ss-btn py-2.5 px-4 ss-caption font-bold"
                style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", borderRadius: "var(--ss-radius-button)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTable}
                disabled={deleting}
                className="ss-btn py-2.5 px-4 ss-caption font-bold disabled:opacity-60"
                style={{ background: "var(--ss-danger)", color: "#fff", borderRadius: "var(--ss-radius-button)" }}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
