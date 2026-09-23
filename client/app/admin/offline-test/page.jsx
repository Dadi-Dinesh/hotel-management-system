"use client";

/**
 * Hidden developer page (Phase 9 — not linked from any nav) for exercising
 * the offline/PWA machinery directly: network status, service worker state,
 * cache contents, and the offline action queue. Reachable only by URL or
 * the link on Settings → App & Offline.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw, Trash2, Radio, Wifi, HardDrive, ListChecks, Send } from "lucide-react";
import { getUser, isAuthenticated } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import { useNetwork } from "../../components/NetworkProvider";
import { useServiceWorker } from "../../components/ServiceWorkerManager";
import { getQueue, enqueueAction, removeFromQueue, drainQueue, clearQueue } from "../../lib/pwa/offlineQueue";
import { requestBackgroundSync, isBackgroundSyncSupported } from "../../lib/pwa/backgroundSync";
import { listCaches, clearAllCaches, estimateStorageUsage, formatBytes } from "../../lib/pwa/cacheManager";
import toast from "react-hot-toast";

export default function OfflineTestPage() {
  const router = useRouter();
  const network = useNetwork();
  const sw = useServiceWorker();
  const [queue, setQueue] = useState([]);
  const [caches, setCaches] = useState([]);
  const [storage, setStorage] = useState(null);
  const [draining, setDraining] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
    }
  }, [router]);

  const refresh = useCallback(async () => {
    setQueue(getQueue());
    setCaches(await listCaches());
    setStorage(await estimateStorageUsage());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleAddTestItem = () => {
    enqueueAction({
      type: "TEST",
      method: "post",
      url: "/print-jobs",
      body: { documentType: "TEST", adapter: "BROWSER", status: "COMPLETED", tableCode: "OFFLINE-TEST" },
      label: "Offline test item",
    });
    toast.success("Test item added to queue.");
    refresh();
  };

  const handleDrain = async () => {
    setDraining(true);
    try {
      const result = await drainQueue();
      toast.success(`Synced ${result.synced}, failed ${result.failed}, remaining ${result.remaining}.`);
      refresh();
    } finally {
      setDraining(false);
    }
  };

  const handleClearQueue = () => {
    clearQueue();
    toast.success("Queue cleared.");
    refresh();
  };

  const handleClearCaches = async () => {
    const n = await clearAllCaches();
    toast.success(`Cleared ${n} cache(s).`);
    refresh();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <Navbar title="Offline Test" subtitle="PWA developer diagnostics" backHref="/admin/settings" />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-2xl p-5 border space-y-2" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Wifi size={16} style={{ color: "var(--color-orange-500)" }} /> Network Status
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Row label="Combined Status" value={network.status} />
            <Row label="navigator.onLine" value={String(network.isOnline)} />
            <Row label="Socket Connected" value={String(network.socketConnected)} />
            <Row label="Last Sync" value={network.lastSyncAt ? new Date(network.lastSyncAt).toLocaleTimeString() : "—"} />
          </div>
          <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            To actually test offline mode: open DevTools → Network tab → set throttling to &ldquo;Offline&rdquo;, then come back to this page.
          </p>
        </section>

        <section className="rounded-2xl p-5 border space-y-2" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Radio size={16} style={{ color: "var(--color-orange-500)" }} /> Service Worker
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Row label="Supported" value={String(sw.supported)} />
            <Row label="Status" value={sw.status} />
            <Row label="Update Available" value={String(sw.updateAvailable)} />
            <Row label="Background Sync API" value={String(isBackgroundSyncSupported())} />
          </div>
        </section>

        <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
              <HardDrive size={16} style={{ color: "var(--color-orange-500)" }} /> Cache Status
            </h2>
            <button onClick={handleClearCaches} className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#DC2626" }}>
              <Trash2 size={12} /> Clear All
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Storage: {storage ? formatBytes(storage.usage) : "—"}
          </p>
          {caches.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No caches yet.</p>
          ) : (
            <div className="space-y-1">
              {caches.map((c) => (
                <div key={c.name} className="flex items-center justify-between p-2 rounded-lg text-xs" style={{ background: "var(--color-cream-100)" }}>
                  <span className="font-mono">{c.name}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{c.entryCount} entries</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
              <ListChecks size={16} style={{ color: "var(--color-orange-500)" }} /> Offline Queue ({queue.length})
            </h2>
            <button onClick={refresh} className="text-[11px] font-bold flex items-center gap-1" style={{ color: "var(--color-orange-600)" }}>
              <RefreshCcw size={12} /> Refresh
            </button>
          </div>

          {queue.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Queue is empty.</p>
          ) : (
            <div className="space-y-1.5">
              {queue.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg text-xs" style={{ background: "var(--color-cream-100)" }}>
                  <div>
                    <p className="font-bold" style={{ color: "var(--color-brown-900)" }}>{item.label || item.type}</p>
                    <p className="font-mono text-[10px]" style={{ color: "var(--color-text-muted)" }}>{item.method.toUpperCase()} {item.url}</p>
                  </div>
                  <button onClick={() => { removeFromQueue(item.id); refresh(); }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ color: "#DC2626" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={handleAddTestItem} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border-2 flex items-center justify-center gap-2" style={{ borderColor: "var(--color-border-light)", color: "var(--color-brown-900)" }}>
              <Send size={13} /> Add Test Item
            </button>
            <button onClick={handleDrain} disabled={draining} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white" style={{ background: "var(--color-orange-500)" }}>
              {draining ? "Draining..." : "Drain Now"}
            </button>
            <button onClick={handleClearQueue} className="px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border-2" style={{ borderColor: "#DC2626", color: "#DC2626" }}>
              Clear
            </button>
          </div>
          <button
            onClick={() => requestBackgroundSync().then((ok) => toast(ok ? "Background Sync registered." : "Background Sync unsupported — using manual retry fallback."))}
            className="w-full py-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-orange-600)" }}
          >
            Request Background Sync
          </button>
        </section>
      </main>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="p-2 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p className="text-xs font-bold font-mono" style={{ color: "var(--color-brown-900)" }}>{value}</p>
    </div>
  );
}
