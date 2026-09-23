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
import Navbar from "../../components/Navbar";
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
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <Navbar title="QR Management" subtitle={restaurant?.name} backHref="/admin/tables" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Bulk action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 rounded-xl border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-100)" }}>
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-brown-900)" }}>
            {selectedIds.size === tables.length && tables.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleBulkRegenerate} disabled={bulkBusy} className="btn-secondary text-xs font-bold uppercase tracking-wider py-2 px-3 flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCcw size={13} /> Regenerate Selected
            </button>
            <button onClick={handleDownloadAllZip} disabled={bulkBusy} className="btn-secondary text-xs font-bold uppercase tracking-wider py-2 px-3 flex items-center gap-1.5 disabled:opacity-50">
              <Download size={13} /> Download All (ZIP)
            </button>
            <button onClick={handlePrintAll} disabled={bulkBusy} className="btn-primary text-xs font-bold uppercase tracking-wider py-2 px-3 flex items-center gap-1.5 disabled:opacity-50">
              <Printer size={13} /> Print All
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
          </div>
        ) : tables.length === 0 ? (
          <EmptyState
            icon={<QrCode size={30} style={{ color: "var(--color-text-muted)" }} />}
            title="No Tables"
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
                  className="rounded-2xl p-4 border flex flex-col items-center gap-3 text-center"
                  style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}
                >
                  <button onClick={() => toggleSelect(table.id)} className="self-start" aria-label={`Select table ${table.code}`}>
                    {selectedIds.has(table.id) ? <CheckSquare size={18} style={{ color: "var(--color-orange-500)" }} /> : <Square size={18} style={{ color: "var(--color-text-muted)" }} />}
                  </button>

                  <QRCodeGenerator slug={restaurant.slug} table={table} token={cachedToken} locked={locked} size={140} />

                  <div>
                    <p className="text-lg font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>Table {table.number}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{table.code}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span
                      className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: table.secureQR ? "#ECFDF5" : "var(--color-cream-100)", color: table.secureQR ? "#065F46" : "var(--color-text-muted)" }}
                    >
                      {table.secureQR ? <ShieldCheck size={10} /> : <ShieldOff size={10} />} {table.secureQR ? "Secure" : "Legacy"}
                    </span>
                    <span
                      className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: table.isOccupied ? "#FFF7ED" : "var(--color-cream-100)", color: table.isOccupied ? "#C2410C" : "var(--color-text-muted)" }}
                    >
                      {table.isOccupied ? "Occupied" : "Available"}
                    </span>
                  </div>

                  <div className="w-full space-y-1 text-[11px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><Clock size={11} /> Last Scanned</span>
                      <span>{timeAgo(table.lastScannedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><ShoppingBag size={11} /> Last Order</span>
                      <span>{table.lastOrder ? `#${table.lastOrder.orderNumber} · ${timeAgo(table.lastOrder.createdAt)}` : "None yet"}</span>
                    </div>
                  </div>

                  <div className="w-full flex items-center gap-1.5 pt-2 mt-1 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                    <button
                      onClick={() => handleRegenerate(table)}
                      disabled={isRegenerating}
                      className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border flex items-center justify-center gap-1 disabled:opacity-50"
                      style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
                    >
                      <RefreshCcw size={11} className={isRegenerating ? "animate-spin" : ""} /> Regen
                    </button>
                    <button
                      onClick={() => handleDownload(table)}
                      disabled={locked}
                      className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border flex items-center justify-center gap-1 disabled:opacity-30"
                      style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
                    >
                      <Download size={11} /> Save
                    </button>
                    <button
                      onClick={() => handlePrint(table)}
                      disabled={locked}
                      className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg flex items-center justify-center gap-1 text-white disabled:opacity-30"
                      style={{ background: "var(--color-orange-500)" }}
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
