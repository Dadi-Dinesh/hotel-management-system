"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  QrCode,
  RefreshCcw,
  Download,
  Printer,
  Clock,
  ShoppingBag,
  ShieldCheck,
  ShieldOff,
  CheckSquare,
  Square,
} from "lucide-react";
import api from "../../lib/api";
import { getUser, isAuthenticated } from "../../lib/auth";
import { useRestaurant } from "../../components/RestaurantContext";
import { DEMO_RESTAURANT } from "../../lib/branding";
import DashboardHeader from "../../components/admin/DashboardHeader";
import QRCodeGenerator from "../../components/QRCodeGenerator";
import EmptyState from "../../components/EmptyState";
import {
  generateSingleTablePosterPDF,
  generateTablePostersPDF,
  generateTablePostersZip,
  printSingleTablePoster,
} from "../../lib/posterUtils";
import toast from "react-hot-toast";

function timeAgo(dateStr) {
  if (!dateStr) return "Never";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function QRManagementPage() {
  const router = useRouter();
  const { restaurant: activeRestaurant } = useRestaurant();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawTokens, setRawTokens] = useState({}); // tableId -> raw token (this session only)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [regeneratingIds, setRegeneratingIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
    }
  }, [router]);

  const restaurant = activeRestaurant || DEMO_RESTAURANT;

  const fetchTables = useCallback(async () => {
    try {
      const res = await api.get("/tables/qr-overview");
      setTables(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load QR data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === tables.length ? new Set() : new Set(tables.map((t) => t.id))));
  };

  const handleRegenerate = async (table) => {
    setRegeneratingIds((prev) => new Set([...prev, table.id]));
    try {
      const res = await api.post(`/tables/${table.id}/regenerate-qr`);
      const token = res.data.data.token;
      setRawTokens((prev) => ({ ...prev, [table.id]: token }));
      toast.success(`New secure QR generated for Table ${table.code}.`);
      fetchTables();
    } catch (error) {
      toast.error("Failed to regenerate QR code");
    } finally {
      setRegeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(table.id);
        return next;
      });
    }
  };

  const handleDownload = (table) => {
    const token = rawTokens[table.id];
    generateSingleTablePosterPDF({ restaurant, table: { ...table, qrToken: token } });
  };

  const handlePrint = (table) => {
    const token = rawTokens[table.id];
    printSingleTablePoster({ restaurant, table: { ...table, qrToken: token } });
  };

  const downloadableTables = useMemo(
    () => tables.filter((t) => !t.secureQR || rawTokens[t.id]).map((t) => ({ ...t, qrToken: rawTokens[t.id] })),
    [tables, rawTokens]
  );

  const handleBulkRegenerate = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one table first.");
      return;
    }
    setBulkBusy(true);
    try {
      const res = await api.post("/tables/regenerate-qr-bulk", { tableIds: Array.from(selectedIds) });
      const tokenMap = {};
      res.data.data.forEach((r) => {
        tokenMap[r.tableId] = r.token;
      });
      setRawTokens((prev) => ({ ...prev, ...tokenMap }));
      toast.success(`Regenerated ${res.data.data.length} QR code(s).`);
      fetchTables();
    } catch (error) {
      toast.error("Bulk regeneration failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDownloadAllZip = async () => {
    const selected = downloadableTables.filter((t) => selectedIds.size === 0 || selectedIds.has(t.id));
    if (selected.length === 0) {
      toast.error("No downloadable QR codes selected — regenerate secure tables first.");
      return;
    }
    setBulkBusy(true);
    try {
      await generateTablePostersZip({ restaurant, tables: selected });
      toast.success(`Downloaded ${selected.length} poster(s) as ZIP.`);
    } catch (error) {
      toast.error("Failed to generate ZIP");
    } finally {
      setBulkBusy(false);
    }
  };

  const handlePrintAll = async () => {
    const selected = downloadableTables.filter((t) => selectedIds.size === 0 || selectedIds.has(t.id));
    if (selected.length === 0) {
      toast.error("No printable QR codes selected — regenerate secure tables first.");
      return;
    }
    setBulkBusy(true);
    try {
      await generateTablePostersPDF({ restaurant, tables: selected });
    } catch (error) {
      toast.error("Failed to generate posters");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <DashboardHeader title="QR Management" subtitle={restaurant?.name} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Bulk action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 rounded-2xl" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}>
          <button onClick={toggleSelectAll} className="flex items-center gap-2 ss-small font-bold" style={{ color: "var(--ss-primary)" }}>
            {selectedIds.size === tables.length && tables.length > 0 ? <CheckSquare size={16} style={{ color: "var(--ss-accent)" }} /> : <Square size={16} style={{ color: "var(--ss-secondary)" }} />}
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkRegenerate}
              disabled={bulkBusy}
              className="ss-btn ss-caption font-bold py-2 px-3 flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", borderRadius: "var(--ss-radius-button)" }}
            >
              <RefreshCcw size={13} /> Regenerate Selected
            </button>
            <button
              onClick={handleDownloadAllZip}
              disabled={bulkBusy}
              className="ss-btn ss-caption font-bold py-2 px-3 flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", borderRadius: "var(--ss-radius-button)" }}
            >
              <Download size={13} /> Download All (ZIP)
            </button>
            <button
              onClick={handlePrintAll}
              disabled={bulkBusy}
              className="ss-btn ss-caption font-bold py-2 px-3 flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
            >
              <Printer size={13} /> Print All
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 rounded-[var(--ss-radius-card)] ss-shimmer" />)}
          </div>
        ) : tables.length === 0 ? (
          <EmptyState
            icon={<QrCode size={28} style={{ color: "var(--ss-secondary)" }} />}
            title="No tables"
            description="Add tables from Table Management first — QR codes will appear here automatically."
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {tables.map((table) => {
              const cachedToken = rawTokens[table.id];
              const locked = table.secureQR && !cachedToken;
              const isRegenerating = regeneratingIds.has(table.id);
              return (
                <motion.div
                  key={table.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  className="rounded-[var(--ss-radius-card)] p-4 flex flex-col items-center gap-3 text-center"
                  style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)", boxShadow: "var(--ss-shadow-sm)" }}
                >
                  <button onClick={() => toggleSelect(table.id)} className="self-start" aria-label={`Select table ${table.code}`}>
                    {selectedIds.has(table.id) ? <CheckSquare size={18} style={{ color: "var(--ss-accent)" }} /> : <Square size={18} style={{ color: "var(--ss-secondary)" }} />}
                  </button>

                  <QRCodeGenerator slug={restaurant.slug} table={table} token={cachedToken} locked={locked} size={140} />

                  <div>
                    <p className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>Table {table.number}</p>
                    <p className="ss-caption font-semibold">{table.code}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span
                      className="ss-caption font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: table.secureQR ? "rgba(27,138,90,0.12)" : "var(--ss-bg)", color: table.secureQR ? "var(--ss-success)" : "var(--ss-secondary)" }}
                    >
                      {table.secureQR ? <ShieldCheck size={10} /> : <ShieldOff size={10} />} {table.secureQR ? "Secure" : "Legacy"}
                    </span>
                    <span
                      className="ss-caption font-bold px-2 py-0.5 rounded-full"
                      style={{ background: table.isOccupied ? "var(--ss-accent-tint)" : "var(--ss-bg)", color: table.isOccupied ? "var(--ss-accent-dark)" : "var(--ss-secondary)" }}
                    >
                      {table.isOccupied ? "Occupied" : "Available"}
                    </span>
                  </div>

                  <div className="w-full space-y-1 ss-caption font-semibold">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><Clock size={11} /> Last Scanned</span>
                      <span>{timeAgo(table.lastScannedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><ShoppingBag size={11} /> Last Order</span>
                      <span>{table.lastOrder ? `#${table.lastOrder.orderNumber} · ${timeAgo(table.lastOrder.createdAt)}` : "None yet"}</span>
                    </div>
                  </div>

                  <div className="w-full flex items-center gap-1.5 pt-2 mt-1 border-t" style={{ borderColor: "var(--ss-border)" }}>
                    <button
                      onClick={() => handleRegenerate(table)}
                      disabled={isRegenerating}
                      className="flex-1 py-2 ss-caption font-bold rounded-full flex items-center justify-center gap-1 disabled:opacity-50"
                      style={{ border: "1px solid var(--ss-border)", color: "var(--ss-primary)" }}
                    >
                      <RefreshCcw size={11} className={isRegenerating ? "animate-spin" : ""} /> Regen
                    </button>
                    <button
                      onClick={() => handleDownload(table)}
                      disabled={locked}
                      className="flex-1 py-2 ss-caption font-bold rounded-full flex items-center justify-center gap-1 disabled:opacity-30"
                      style={{ border: "1px solid var(--ss-border)", color: "var(--ss-primary)" }}
                    >
                      <Download size={11} /> Save
                    </button>
                    <button
                      onClick={() => handlePrint(table)}
                      disabled={locked}
                      className="flex-1 py-2 ss-caption font-bold rounded-full flex items-center justify-center gap-1 disabled:opacity-30"
                      style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)" }}
                    >
                      <Printer size={11} /> Print
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
    </div>
  );
}
