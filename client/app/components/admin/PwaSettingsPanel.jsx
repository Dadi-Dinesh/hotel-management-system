"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Smartphone, RefreshCcw, Trash2, HardDrive, Clock, CheckCircle2, XCircle, Wrench } from "lucide-react";
import { useServiceWorker } from "../ServiceWorkerManager";
import { useNetwork } from "../NetworkProvider";
import { listCaches, estimateStorageUsage, formatBytes, clearAllCaches } from "../../lib/pwa/cacheManager";
import { getQueueLength } from "../../lib/pwa/offlineQueue";
import toast from "react-hot-toast";

const APP_VERSION = "1.0.0";

export default function PwaSettingsPanel() {
  const { supported, status, updateAvailable, forceRefresh } = useServiceWorker();
  const { lastSyncAt, queueLength: liveQueueLength } = useNetwork();
  const [caches, setCaches] = useState([]);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cacheList, usage] = await Promise.all([listCaches(), estimateStorageUsage()]);
    setCaches(cacheList);
    setStorage(usage);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cacheVersion = caches[0]?.name?.match(/-v(\d+)$/)?.[0]?.replace("-v", "v") || "—";
  const totalEntries = caches.reduce((sum, c) => sum + c.entryCount, 0);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      const count = await clearAllCaches();
      toast.success(`Cleared ${count} cache${count === 1 ? "" : "s"}.`);
      await load();
    } catch {
      toast.error("Failed to clear cache.");
    } finally {
      setClearing(false);
    }
  };

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      await forceRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
        <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
          <Smartphone size={16} style={{ color: "var(--color-orange-500)" }} /> App & Service Worker
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="App Version" value={APP_VERSION} />
          <Stat label="Cache Version" value={cacheVersion} />
          <Stat
            label="Service Worker"
            value={!supported ? "Unsupported" : status === "active" ? "Active" : status === "error" ? "Failed" : "Registering..."}
            icon={supported && status === "active" ? CheckCircle2 : XCircle}
            ok={supported && status === "active"}
          />
          <Stat label="Last Sync" value={lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "—"} icon={Clock} neutral />
        </div>
        {updateAvailable && (
          <div className="flex items-center justify-between p-2.5 rounded-lg text-xs" style={{ background: "#FFFBEB", color: "#B45309" }}>
            <span className="font-bold">A new version is ready.</span>
            <button onClick={handleForceRefresh} className="font-bold underline">Update now</button>
          </div>
        )}
      </section>

      <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
        <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
          <HardDrive size={16} style={{ color: "var(--color-orange-500)" }} /> Offline Cache
        </h2>
        {loading ? (
          <div className="h-16 rounded-lg animate-pulse" style={{ background: "var(--color-cream-200)" }} />
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="Cached Files" value={String(totalEntries)} />
            <Stat label="Storage Used" value={storage ? formatBytes(storage.usage) : "—"} />
            <Stat label="Queued Actions" value={String(liveQueueLength ?? getQueueLength())} neutral />
            <Stat label="Cache Buckets" value={String(caches.length)} neutral />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border-2 flex items-center justify-center gap-2"
            style={{ borderColor: "#DC2626", color: "#DC2626", background: "white" }}
          >
            <Trash2 size={14} /> {clearing ? "Clearing..." : "Clear Cache"}
          </button>
          <button
            onClick={handleForceRefresh}
            disabled={refreshing}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2"
            style={{ background: "var(--color-brown-900)" }}
          >
            <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} /> Force Refresh
          </button>
        </div>
        <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          Clearing cache removes offline copies of the menu, images, and branding — nothing you&rsquo;ve saved is affected. Force Refresh reloads the app with the latest version.
        </p>
      </section>

      <Link
        href="/admin/offline-test"
        className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border-2"
        style={{ borderColor: "var(--color-border-light)", color: "var(--color-text-secondary)" }}
      >
        <Wrench size={13} /> Open Offline Diagnostics
      </Link>
    </div>
  );
}

function Stat({ label, value, icon: Icon, ok, neutral }) {
  return (
    <div className="p-2.5 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p className="text-xs font-bold flex items-center gap-1" style={{ color: neutral ? "var(--color-brown-900)" : ok === false ? "#DC2626" : ok ? "var(--color-success)" : "var(--color-brown-900)" }}>
        {Icon && <Icon size={11} />} {value}
      </p>
    </div>
  );
}
