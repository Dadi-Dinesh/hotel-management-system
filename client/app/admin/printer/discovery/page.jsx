"use client";

import { useState, useEffect } from "react";
import { RefreshCcw, Usb, Wifi, Bluetooth, Printer, CheckCircle2, XCircle, Info } from "lucide-react";
import DashboardHeader from "../../../components/admin/DashboardHeader";
import PrinterNav from "../../../components/admin/PrinterNav";
import { usePrinter } from "../../../lib/printer/usePrinter";
import { usePrinterSettings } from "../../../lib/printer/usePrinterSettings";
import { networkAdapter } from "../../../lib/printer/adapters/networkAdapter";
import { bluetoothAdapter } from "../../../lib/printer/adapters/bluetoothAdapter";
import toast from "react-hot-toast";

export default function PrinterDiscoveryPage() {
  const { status, isConnected, detectedPorts, isLoadingPorts, detectPorts, lastConnected, lastPrinted, queueMetrics } = usePrinter();
  const { settings } = usePrinterSettings();
  const [networkTesting, setNetworkTesting] = useState(false);
  const [networkResult, setNetworkResult] = useState(null);
  const [btSupported, setBtSupported] = useState(false);
  const [btPairing, setBtPairing] = useState(false);
  const [btResult, setBtResult] = useState(null);

  useEffect(() => {
    setBtSupported(bluetoothAdapter.isAvailable());
  }, []);

  const handleTestNetwork = async () => {
    if (!settings.networkPrinterIp) {
      toast.error("No network printer configured yet — set one up in Print Settings.");
      return;
    }
    setNetworkTesting(true);
    setNetworkResult(null);
    try {
      const res = await networkAdapter.testConnection(settings.networkPrinterIp, settings.networkPrinterPort);
      setNetworkResult(res);
    } finally {
      setNetworkTesting(false);
    }
  };

  const handlePairBluetooth = async () => {
    setBtPairing(true);
    setBtResult(null);
    try {
      const res = await bluetoothAdapter.pair();
      setBtResult(res);
      if (res.success) toast.success("Bluetooth printer paired!");
      else toast.error(res.error || "Pairing failed.");
    } finally {
      setBtPairing(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <DashboardHeader title="Printer Discovery" subtitle="Find & test connected printers" />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <PrinterNav active="/admin/printer/discovery" />

        {/* Printer Health */}
        <section className="rounded-2xl p-5 border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Printer size={16} style={{ color: "var(--color-orange-500)" }} /> Printer Health
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <HealthStat label="Agent" value={isConnected ? "Online" : "Offline"} ok={isConnected} />
            <HealthStat label="Queue Length" value={String(queueMetrics?.waitingJobs ?? 0)} ok={(queueMetrics?.waitingJobs ?? 0) === 0} neutral />
            <HealthStat label="Last Connected" value={lastConnected ? new Date(lastConnected).toLocaleTimeString() : "—"} neutral />
            <HealthStat label="Last Printed" value={lastPrinted ? new Date(lastPrinted).toLocaleTimeString() : "—"} neutral />
          </div>
        </section>

        {/* USB / Serial (ESC/POS thermal) */}
        <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
              <Usb size={16} style={{ color: "var(--color-orange-500)" }} /> USB / Serial Thermal Printers
            </h2>
            <button onClick={detectPorts} disabled={isLoadingPorts} className="text-[11px] font-bold flex items-center gap-1" style={{ color: "var(--color-orange-600)" }}>
              <RefreshCcw size={12} className={isLoadingPorts ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          {detectedPorts.length > 0 ? (
            <div className="space-y-1.5">
              {detectedPorts.map((p) => (
                <div key={p.path} className="flex items-center justify-between p-2.5 rounded-lg text-xs" style={{ background: "var(--color-cream-100)" }}>
                  <div>
                    <p className="font-mono font-bold" style={{ color: "var(--color-brown-900)" }}>{p.path}</p>
                    <p style={{ color: "var(--color-text-muted)" }}>{p.manufacturer || "Generic Serial Device"}</p>
                  </div>
                  <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center py-4" style={{ color: "var(--color-text-muted)" }}>No serial ports detected. Plug in a USB thermal printer (TVS, Epson, Rongta, XPrinter, POS-58/80, Sunmi) and click Refresh.</p>
          )}
          <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Full port configuration lives on the Hardware Agent tab.</p>
        </section>

        {/* Network */}
        <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Wifi size={16} style={{ color: "var(--color-orange-500)" }} /> Network Printer
          </h2>
          {settings.networkPrinterIp ? (
            <>
              <p className="text-xs font-mono font-bold" style={{ color: "var(--color-brown-900)" }}>{settings.networkPrinterIp}:{settings.networkPrinterPort}</p>
              <button onClick={handleTestNetwork} disabled={networkTesting} className="btn-secondary text-xs font-bold uppercase tracking-wider px-4 py-2">
                {networkTesting ? "Testing..." : "Test Connection"}
              </button>
              {networkResult && (
                <div className="flex items-center gap-2 text-xs mt-1" style={{ color: networkResult.success ? "var(--color-success)" : "#DC2626" }}>
                  {networkResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {networkResult.success ? "Reachable" : networkResult.error}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No network printer configured. Add an IP address and port (usually 9100) in Print Settings.</p>
          )}
        </section>

        {/* Bluetooth */}
        <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Bluetooth size={16} style={{ color: "var(--color-orange-500)" }} /> Bluetooth Printer
          </h2>
          {btSupported ? (
            <>
              <button onClick={handlePairBluetooth} disabled={btPairing} className="btn-secondary text-xs font-bold uppercase tracking-wider px-4 py-2">
                {btPairing ? "Opening picker..." : "Pair Bluetooth Printer"}
              </button>
              {btResult && !btResult.success && (
                <p className="text-xs mt-1" style={{ color: "#DC2626" }}>{btResult.error}</p>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2 text-xs p-3 rounded-lg" style={{ background: "var(--color-cream-100)", color: "var(--color-text-muted)" }}>
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              Web Bluetooth isn&apos;t supported in this browser. Use Chrome or Edge (desktop or Android) over HTTPS, or use Network / Browser printing instead.
            </div>
          )}
        </section>

        {/* Regular / System printers */}
        <section className="rounded-2xl p-5 border space-y-2" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Printer size={16} style={{ color: "var(--color-orange-500)" }} /> Regular Printers (HP, Canon, Brother, Inkjet, LaserJet)
          </h2>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            These print through your operating system, not this page — browsers intentionally don&apos;t expose a list of installed printers for privacy. Choosing &quot;Browser Print&quot; or &quot;PDF&quot; in Print Settings opens the native print dialog, where every printer installed on this device already shows up.
          </p>
        </section>
      </main>
    </div>
  );
}

function HealthStat({ label, value, ok, neutral }) {
  return (
    <div className="p-2.5 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p className="text-xs font-bold" style={{ color: neutral ? "var(--color-brown-900)" : ok ? "var(--color-success)" : "#DC2626" }}>{value}</p>
    </div>
  );
}
