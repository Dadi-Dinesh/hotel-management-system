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
  X,
  RefreshCcw,
  AlertTriangle,
  Receipt,
  LogOut,
  Sliders,
} from "lucide-react";
import api from "../../lib/api";
import { getUser, clearAuth, isAuthenticated } from "../../lib/auth";
import { useSocket } from "../../components/SocketProvider";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";

export default function AdminTablesPage() {
  const router = useRouter();
  const { socket } = useSocket();

  const [user, setUser] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [filter, setFilter] = useState("all"); // "all", "occupied", "available", "disabled"

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

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket) return;
    socket.emit("join-admin");

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
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <Navbar
        title="Table Management"
        subtitle="Live Seating & Table Controls"
        backHref="/admin/dashboard"
        rightContent={
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTables}
              className="w-10 h-10 border flex items-center justify-center transition-colors hover:bg-brown-900 hover:text-white"
              style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
              title="Refresh"
            >
              <RefreshCcw size={18} />
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="btn-primary flex items-center gap-2 text-xs font-bold uppercase tracking-wider py-2.5 px-4"
            >
              <Plus size={16} /> ADD TABLE
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Seating Overview Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Total Capacity */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                Total Capacity
              </span>
              <Users size={20} style={{ color: "var(--color-brown-900)" }} />
            </div>
            <p className="text-3xl font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              {totalCapacity} <span className="text-sm font-bold text-gray-500">SEATS</span>
            </p>
            <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Across {availableTablesCount + occupiedTablesCount} active tables
            </p>
          </div>

          {/* Occupied Seats */}
          <div className="card border-l-4" style={{ borderLeftColor: "var(--color-orange-500)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                Occupied Seats
              </span>
              <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
            </div>
            <p className="text-3xl font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-500)" }}>
              {occupiedSeats} <span className="text-sm font-bold opacity-80">SEATS</span>
            </p>
            <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {occupiedTablesCount} Tables Occupied
            </p>
          </div>

          {/* Free Seats */}
          <div className="card border-l-4" style={{ borderLeftColor: "var(--color-success)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                Free Seats
              </span>
              <div className="w-3 h-3 rounded-full bg-green-600" />
            </div>
            <p className="text-3xl font-black text-green-700" style={{ fontFamily: "var(--font-heading)" }}>
              {freeSeats} <span className="text-sm font-bold opacity-80">SEATS</span>
            </p>
            <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {availableTablesCount} Tables Available
            </p>
          </div>

          {/* Occupation Percentage */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                Occupancy Rate
              </span>
              <Sliders size={20} style={{ color: "var(--color-brown-900)" }} />
            </div>
            <p className="text-3xl font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              {totalCapacity > 0 ? Math.round((occupiedSeats / totalCapacity) * 100) : 0}%
            </p>
            <div className="w-full bg-gray-200 h-2 mt-2 rounded-full overflow-hidden">
              <div
                className="bg-orange-500 h-full transition-all duration-500"
                style={{ width: `${totalCapacity > 0 ? (occupiedSeats / totalCapacity) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b" style={{ borderColor: "var(--color-brown-900)" }}>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: `ALL TABLES (${tables.length})` },
              { id: "occupied", label: `OCCUPIED (${occupiedTablesCount})` },
              { id: "available", label: `AVAILABLE (${availableTablesCount})` },
              { id: "disabled", label: `DISABLED (${disabledTablesCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`text-xs font-black uppercase tracking-wider px-4 py-2 border transition-all ${
                  filter === tab.id
                    ? "bg-brown-900 text-white border-brown-900"
                    : "bg-surface text-brown-900 border-brown-900 hover:bg-cream-200"
                }`}
                style={{
                  fontFamily: "var(--font-heading)",
                  background: filter === tab.id ? "var(--color-brown-900)" : "var(--color-surface)",
                  color: filter === tab.id ? "white" : "var(--color-brown-900)",
                  borderColor: "var(--color-brown-900)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Showing {filteredTables.length} of {tables.length} tables
          </span>
        </div>

        {/* Tables Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="skeleton h-44 w-full border border-brown-900" />
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-brown-900">
            <UtensilsCrossed size={48} className="mx-auto mb-3 opacity-30 text-brown-900" />
            <p className="font-bold uppercase tracking-widest text-sm text-gray-600">
              No tables match this filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

              return (
                <div
                  key={table.id}
                  className={`card relative flex flex-col justify-between border-2 transition-all ${
                    !table.isActive
                      ? "opacity-60 bg-gray-100 border-gray-400"
                      : isBillRequested
                      ? "border-amber-500 bg-amber-50/50"
                      : isOccupied
                      ? "border-orange-500 bg-orange-50/30"
                      : "border-brown-900 bg-surface"
                  }`}
                  style={{
                    borderColor: !table.isActive
                      ? "#a1a1aa"
                      : isBillRequested
                      ? "#f59e0b"
                      : isOccupied
                      ? "var(--color-orange-500)"
                      : "var(--color-brown-900)",
                  }}
                >
                  {/* Top Bar: Table Code & Status Badge */}
                  <div>
                    <div className="flex items-start justify-between mb-3 pb-3 border-b border-brown-900">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span
                            className="text-2xl font-black"
                            style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
                          >
                            {table.code}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            Table #{table.number}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider mt-1 text-brown-800">
                          👥 {table.capacity || 4} Seats
                        </span>
                      </div>

                      {/* Status pill */}
                      {!table.isActive ? (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-gray-300 text-gray-700 border border-gray-500">
                          DISABLED
                        </span>
                      ) : isBillRequested ? (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-amber-500 text-white border border-amber-700 animate-pulse flex items-center gap-1">
                          <Receipt size={12} /> BILL
                        </span>
                      ) : isOccupied ? (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-orange-500 text-white border border-brown-900">
                          OCCUPIED
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-green-600 text-white border border-green-800">
                          AVAILABLE
                        </span>
                      )}
                    </div>

                    {/* Session info if occupied */}
                    {isOccupied && (
                      <div className="mb-4 p-2.5 bg-cream-100 border border-brown-900 space-y-1 text-xs font-bold">
                        <div className="flex justify-between text-brown-900">
                          <span>Running Total:</span>
                          <span className="text-orange-600 font-black">₹{runningTotal}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 text-[11px]">
                          <span>Orders:</span>
                          <span>{table.activeSession.orders?.length || 0} placed</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-brown-900 mt-2">
                    <button
                      onClick={() => handleToggleActive(table)}
                      className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1.5 border transition-colors ${
                        table.isActive
                          ? "border-red-800 text-red-800 hover:bg-red-800 hover:text-white"
                          : "border-green-800 text-green-800 hover:bg-green-800 hover:text-white"
                      }`}
                      title={table.isActive ? "Disable table" : "Enable table"}
                    >
                      {table.isActive ? "DISABLE" : "ENABLE"}
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEditModal(table)}
                        className="p-1.5 border border-brown-900 hover:bg-brown-900 hover:text-white transition-colors"
                        title="Edit capacity & details"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingTable(table)}
                        className="p-1.5 border border-red-800 text-red-800 hover:bg-red-800 hover:text-white transition-colors"
                        title="Delete table"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setModalOpen(false)}
          />
          <div
            className="relative w-full max-w-md bg-surface border-2 border-brown-900 p-6 shadow-2xl animate-scale-in"
            style={{ background: "var(--color-surface)" }}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-brown-900">
              <h3
                className="text-lg font-black uppercase tracking-widest"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
              >
                {editingTable ? `Edit Table ${editingTable.code}` : "Add New Table"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 border border-brown-900 flex items-center justify-center hover:bg-brown-900 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-brown-900">
                  Table Code (QR Identifier)
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. T01"
                  className="w-full px-3 py-2 border-2 border-brown-900 bg-white font-bold text-base uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-brown-900">
                  Table Number
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 border-2 border-brown-900 bg-white font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-brown-900">
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
                  className="w-full px-3 py-2 border-2 border-brown-900 bg-white font-bold text-base"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 border-2 border-brown-900 accent-orange-500 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-bold uppercase tracking-wider text-brown-900 cursor-pointer">
                  Table Active (Available for dining)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-brown-900 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary py-2.5 px-4 text-xs font-bold uppercase tracking-wider"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider"
                >
                  {submitting ? "SAVING..." : editingTable ? "UPDATE TABLE" : "CREATE TABLE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setDeletingTable(null)}
          />
          <div className="relative w-full max-w-sm bg-surface border-2 border-red-800 p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4 text-red-700">
              <AlertTriangle size={28} />
              <h3 className="text-lg font-black uppercase tracking-widest" style={{ fontFamily: "var(--font-heading)" }}>
                Delete Table {deletingTable.code}?
              </h3>
            </div>
            <p className="text-sm font-semibold mb-6 text-gray-700 leading-relaxed">
              Are you sure you want to delete Table <strong>{deletingTable.code}</strong> (Table #{deletingTable.number}, {deletingTable.capacity || 4} Seats)? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingTable(null)}
                className="btn-secondary py-2 text-xs font-bold uppercase tracking-wider"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeleteTable}
                disabled={deleting}
                className="px-4 py-2 bg-red-800 text-white border-2 border-red-950 text-xs font-bold uppercase tracking-wider hover:bg-red-900"
              >
                {deleting ? "DELETING..." : "CONFIRM DELETE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
