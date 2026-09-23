"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCcw, History, RotateCcw, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import Navbar from "../../../components/Navbar";
import PrinterNav from "../../../components/admin/PrinterNav";
import EmptyState from "../../../components/EmptyState";
import api from "../../../lib/api";
import { PrintService } from "../../../lib/printer/PrintService";
import { usePrinterSettings } from "../../../lib/printer/usePrinterSettings";
import toast from "react-hot-toast";

const STATUS_STYLES = {
  PENDING: { bg: "#EFF6FF", color: "#1D4ED8", icon: Clock, label: "Pending" },
  PRINTING: { bg: "#FFFBEB", color: "#B45309", icon: Loader2, label: "Printing" },
  COMPLETED: { bg: "#ECFDF5", color: "#065F46", icon: CheckCircle2, label: "Completed" },
  FAILED: { bg: "#FEF2F2", color: "#991B1B", icon: XCircle, label: "Failed" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "COMPLETED", label: "Completed" },
  { key: "FAILED", label: "Failed" },
];

export default function PrintHistoryPage() {
  const { settings } = usePrinterSettings();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [reprintingId, setReprintingId] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/print-jobs?status=${filter}&limit=100`);
      setJobs(res.data.data || []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleReprint = async (job) => {
    if (!job.payloadSnapshot) {
      toast.error("No saved data for this job — can't reprint.");
      return;
    }
    setReprintingId(job.id);
    try {
      const outcome = await PrintService.print({
        documentType: job.documentType,
        data: job.payloadSnapshot,
        settings,
      });
      if (outcome.success) toast.success("Reprinted.");
      else toast.error("Reprint failed on every available method.");
      fetchHistory();
    } finally {
      setReprintingId(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <Navbar title="Print History" subtitle="Every job, permanently" backHref="/admin/dashboard" />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <PrinterNav active="/admin/printer/history" />

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border"
                style={{
                  background: filter === f.key ? "var(--color-brown-900)" : "white",
                  color: filter === f.key ? "white" : "var(--color-text-secondary)",
                  borderColor: filter === f.key ? "var(--color-brown-900)" : "var(--color-border-light)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={fetchHistory} className="text-[11px] font-bold flex items-center gap-1" style={{ color: "var(--color-orange-600)" }}>
            <RefreshCcw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<History size={30} style={{ color: "var(--color-text-muted)" }} />}
            title="No Print History Yet"
            description="Printed bills and KOTs will show up here — nothing is ever deleted."
          />
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const style = STATUS_STYLES[job.status] || STATUS_STYLES.COMPLETED;
              const StatusIcon = style.icon;
              return (
                <div key={job.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon size={16} style={{ color: style.color }} className={job.status === "PRINTING" ? "animate-spin" : ""} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: "var(--color-brown-900)" }}>
                        {job.documentType} {job.tableCode ? `· Table ${job.tableCode}` : ""} {job.orderNumber ? `· #${job.orderNumber}` : ""}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>
                        {job.adapter} · {new Date(job.createdAt).toLocaleString()}
                      </p>
                      {job.errorMessage && job.status === "FAILED" && (
                        <p className="text-[10px] truncate" style={{ color: "#DC2626" }}>{job.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: style.bg, color: style.color }}>
                      {style.label}
                    </span>
                    {job.payloadSnapshot && (
                      <button
                        onClick={() => handleReprint(job)}
                        disabled={reprintingId === job.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center border"
                        style={{ borderColor: "var(--color-border-light)" }}
                        title="Reprint"
                      >
                        <RotateCcw size={13} className={reprintingId === job.id ? "animate-spin" : ""} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
