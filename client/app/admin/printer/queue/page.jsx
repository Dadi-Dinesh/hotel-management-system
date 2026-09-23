"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCcw, Clock, X, Loader2 } from "lucide-react";
import Navbar from "../../../components/Navbar";
import PrinterNav from "../../../components/admin/PrinterNav";
import EmptyState from "../../../components/EmptyState";
import { useSocket } from "../../../components/SocketProvider";
import api from "../../../lib/api";
import toast from "react-hot-toast";

const STATUS_STYLES = {
  PENDING: { bg: "#EFF6FF", color: "#1D4ED8", label: "Pending" },
  PRINTING: { bg: "#FFFBEB", color: "#B45309", label: "Printing" },
};

export default function PrintQueuePage() {
  const { socket } = useSocket();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await api.get("/print-jobs?status=active");
      setJobs(res.data.data || []);
    } catch {
      // Non-admin roles or a not-yet-scoped session simply see an empty queue.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchQueue();
    socket.on("print-job:update", handler);
    return () => socket.off("print-job:update", handler);
  }, [socket, fetchQueue]);

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      await api.patch(`/print-jobs/${id}/cancel`);
      toast.success("Job cancelled.");
      fetchQueue();
    } catch {
      toast.error("Failed to cancel job.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <Navbar title="Print Queue" subtitle="Live pending & in-progress jobs" backHref="/admin/dashboard" />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <PrinterNav active="/admin/printer/queue" />

        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            {jobs.length} job{jobs.length === 1 ? "" : "s"} in queue
          </p>
          <button onClick={fetchQueue} className="text-[11px] font-bold flex items-center gap-1" style={{ color: "var(--color-orange-600)" }}>
            <RefreshCcw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<Clock size={30} style={{ color: "var(--color-text-muted)" }} />}
            title="Queue is Empty"
            description="Nothing pending — every print job has completed or failed already. Completed jobs move to Print History."
          />
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const style = STATUS_STYLES[job.status] || STATUS_STYLES.PENDING;
              return (
                <div key={job.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
                  <div className="flex items-center gap-3">
                    {job.status === "PRINTING" ? <Loader2 size={16} className="animate-spin" style={{ color: style.color }} /> : <Clock size={16} style={{ color: style.color }} />}
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--color-brown-900)" }}>
                        {job.documentType} {job.tableCode ? `· Table ${job.tableCode}` : ""} {job.orderNumber ? `· #${job.orderNumber}` : ""}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                        {job.adapter} · {new Date(job.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: style.bg, color: style.color }}>
                      {style.label}
                    </span>
                    <button onClick={() => handleCancel(job.id)} disabled={cancellingId === job.id} className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ borderColor: "var(--color-border-light)" }} title="Cancel">
                      <X size={13} />
                    </button>
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
