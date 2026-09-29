"use client";

import { useState, useEffect } from "react";
import {
  Printer,
  RefreshCcw,
  Receipt,
  Utensils,
  Terminal,
  Cpu,
  Wifi,
  Save,
  Search,
  Layers,
  Activity,
} from "lucide-react";
import DashboardHeader from "../../components/admin/DashboardHeader";
import PrinterNav from "../../components/admin/PrinterNav";
import EmptyState from "../../components/EmptyState";
import { usePrinter } from "../../lib/printer/usePrinter";
import toast from "react-hot-toast";

export default function PrinterAdminPage() {
  const {
    status,
    port,
    baudRate,
    kitchenMode,
    queueMetrics,
    stats,
    lastConnected,
    lastPrinted,
    lastError,
    detectedPorts,
    isLoadingPorts,
    isPrinting,
    detectPorts,
    updateConfig,
    reconnectPrinter,
    printTest,
    printBill,
    printKOT,
  } = usePrinter();

  // Local form state for editing configuration
  const [selectedPort, setSelectedPort] = useState(port);
  const [selectedBaud, setSelectedBaud] = useState(baudRate);
  const [selectedKitchenMode, setSelectedKitchenMode] = useState(kitchenMode || "LIVE");

  // Sync state when loaded
  useEffect(() => {
    if (port) setSelectedPort(port);
    if (baudRate) setSelectedBaud(baudRate);
    if (kitchenMode) setSelectedKitchenMode(kitchenMode);
  }, [port, baudRate, kitchenMode]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!selectedPort) {
      toast.error("Please select or enter a serial port path");
      return;
    }
    await updateConfig(selectedPort, Number(selectedBaud), selectedKitchenMode);
  };

  const demoOrder = {
    id: "ORD-9999",
    orderNumber: 99,
    tableCode: "T05",
    createdAt: new Date().toISOString(),
    items: [
      { name: "Chicken 65 (Starter)", quantity: 2, price: 280 },
      { name: "Butter Chicken (Curry)", quantity: 1, price: 340 },
      { name: "Paneer Butter Masala", quantity: 1, price: 260 },
      { name: "Veg Fried Rice", quantity: 2, price: 220 },
      { name: "Pulka", quantity: 10, price: 10 },
    ],
    notes: "Make curries medium spicy",
    paymentMethod: "UPI",
  };

  const statusStyle =
    status === "CONNECTED"
      ? { bg: "rgba(27,138,90,0.1)", color: "var(--color-success, #1B8A5A)", dot: "var(--color-success, #1B8A5A)", label: "🟢 Connected" }
      : status === "CONNECTING"
      ? { bg: "rgba(214,140,20,0.1)", color: "#B45309", dot: "#F59E0B", label: "🟡 Reconnecting..." }
      : { bg: "rgba(214,69,69,0.1)", color: "#DC2626", dot: "#EF4444", label: "🔴 Disconnected" };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <DashboardHeader title="Hardware Agent" subtitle="Node.js SerialPort POS driver & settings manager" />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <PrinterNav active="/admin/printer" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-orange-500)", color: "white" }}
            >
              <Printer size={19} strokeWidth={2.2} />
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Configure the raw USB/Serial connection used by the Thermal Agent adapter.
            </p>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest flex-shrink-0 self-start sm:self-auto"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            <span
              className={status === "CONNECTED" ? "animate-pulse" : status === "CONNECTING" ? "animate-bounce" : ""}
              style={{ width: 8, height: 8, borderRadius: 999, background: statusStyle.dot, display: "inline-block" }}
            />
            {statusStyle.label}
          </div>
        </div>

        {/* Settings Card */}
        <form
          onSubmit={handleSaveConfig}
          className="rounded-2xl p-5 border space-y-4"
          style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}
        >
          <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Wifi size={16} style={{ color: "var(--color-orange-500)" }} /> Printer Hardware Configuration
          </h2>

          <div className="space-y-4 text-xs">
            {/* Port Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold" style={{ color: "var(--color-text-secondary)" }}>Hardware Serial Port</label>
                <button
                  type="button"
                  onClick={detectPorts}
                  disabled={isLoadingPorts}
                  className="text-[11px] font-bold flex items-center gap-1"
                  style={{ color: "var(--color-orange-600)" }}
                >
                  <Search size={12} className={isLoadingPorts ? "animate-spin" : ""} />
                  Scan Ports
                </button>
              </div>

              {detectedPorts.length > 0 ? (
                <select value={selectedPort} onChange={(e) => setSelectedPort(e.target.value)} className="input font-mono">
                  {detectedPorts.map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.path} {p.manufacturer ? `(${p.manufacturer})` : ""}
                    </option>
                  ))}
                  {!detectedPorts.some((p) => p.path === selectedPort) && (
                    <option value={selectedPort}>{selectedPort} (Current Custom)</option>
                  )}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedPort}
                  onChange={(e) => setSelectedPort(e.target.value)}
                  placeholder="e.g. /dev/cu.usbserial-10 or COM3"
                  className="input font-mono"
                />
              )}
              <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                macOS: <code className="font-mono">/dev/cu.usbserial-10</code> · Windows: <code className="font-mono">COM3</code> · Linux: <code className="font-mono">/dev/ttyUSB0</code>
              </p>
            </div>

            {/* Baud Rate Selector */}
            <div>
              <label className="font-bold block mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Serial Baud Rate</label>
              <select value={selectedBaud} onChange={(e) => setSelectedBaud(Number(e.target.value))} className="input font-mono">
                <option value={9600}>9600 Baud (Standard Thermal Default)</option>
                <option value={19200}>19200 Baud (High Speed HS-802)</option>
                <option value={38400}>38400 Baud</option>
                <option value={57600}>57600 Baud</option>
                <option value={115200}>115200 Baud</option>
              </select>
            </div>

            {/* Kitchen Mode Selector */}
            <div>
              <label className="font-bold block mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Kitchen Mode (KOT Copy Routing)</label>
              <select
                value={selectedKitchenMode}
                onChange={(e) => setSelectedKitchenMode(e.target.value)}
                className="input font-mono font-black"
                style={{ background: "var(--color-cream-100)" }}
              >
                <option value="LIVE">● LIVE MODE (1 Waiter KOT Copy per order — Kitchen uses screen)</option>
                <option value="NORMAL">● NORMAL MODE (Kitchen dishes: 2 Copies | Beverages: 1 Copy)</option>
              </select>
              <p className="text-[10px] mt-1 font-medium" style={{ color: "var(--color-text-muted)" }}>
                {selectedKitchenMode === "LIVE"
                  ? "LIVE MODE: Only 1 Waiter Copy is printed. Kitchen receives orders on the WebSocket screen."
                  : "NORMAL MODE: Kitchen dishes (Starters, Curries, Fried Rice) print 2 copies (Chef + Waiter). Beverages & Ready items print 1 copy."}
              </p>
            </div>

            <div className="pt-1 flex gap-2">
              <button type="submit" className="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Save size={14} />
                Save & Apply
              </button>

              <button
                type="button"
                onClick={reconnectPrinter}
                className="btn-secondary px-3.5 py-2.5 flex items-center justify-center"
                title="Force Reconnect"
              >
                <RefreshCcw size={14} />
              </button>
            </div>
          </div>
        </form>

        {/* Connection Info & Errors */}
        <div className="rounded-2xl p-5 border space-y-2 text-xs" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide mb-1 flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Activity size={16} style={{ color: "var(--color-orange-500)" }} /> Live Hardware Metrics
          </h2>

          <MetricRow label="Connection Status" value={statusStyle.label.replace(/^\S+\s/, "")} valueColor={statusStyle.color} />
          <MetricRow label="Active USB Port" value={port || "—"} mono />
          <MetricRow
            label="Printer Name"
            value={
              detectedPorts.find((p) => p.path === port)?.friendlyName ||
              detectedPorts.find((p) => p.path === port)?.manufacturer ||
              "HS-802UWB Thermal Printer"
            }
          />
          <MetricRow label="Baud Rate" value={`${baudRate} bps`} mono />
          <MetricRow label="Queue Length" value={`${queueMetrics?.waitingJobs || 0} Pending Jobs`} valueColor="var(--color-orange-600)" />
          <MetricRow label="Total Printed" value={`${stats?.totalPrinted || 0} Receipts`} valueColor="var(--color-success, #1B8A5A)" />

          {lastPrinted && (
            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Last Printed</span>
              <span className="font-bold" style={{ color: "var(--color-brown-900)" }}>{new Date(lastPrinted).toLocaleTimeString("en-IN")}</span>
            </div>
          )}

          {lastConnected && (
            <div className="p-2 rounded-lg text-[11px] font-medium" style={{ background: "rgba(27,138,90,0.08)", color: "var(--color-success, #1B8A5A)" }}>
              Last connected: {new Date(lastConnected).toLocaleTimeString("en-IN")}
            </div>
          )}

          {lastError && (
            <div className="p-2.5 rounded-xl border text-[11px] font-medium break-words" style={{ background: "rgba(220,38,38,0.06)", borderColor: "rgba(220,38,38,0.25)", color: "#B91C1C" }}>
              <span className="font-bold block">Printer Error Notice</span>
              {lastError}
            </div>
          )}
        </div>

        {/* Serial ESC/POS Print Operations */}
        <div className="rounded-2xl p-5 border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <h2 className="text-sm font-black uppercase tracking-wide mb-1.5 flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Cpu size={16} style={{ color: "var(--color-orange-500)" }} /> Serial ESC/POS Print Operations
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
            Sends 80mm ESC/POS binary print payloads directly to the Node.js serial service over{" "}
            <code className="px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: "var(--color-cream-100)" }}>{port}</code>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={printTest}
              disabled={isPrinting}
              className="p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.97]"
              style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}
            >
              <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-cream-200)" }}>
                <Printer size={18} style={{ color: "var(--color-orange-500)" }} />
              </span>
              <span className="font-bold text-xs uppercase tracking-wider" style={{ color: "var(--color-brown-900)" }}>Test Print</span>
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>POST /api/printer/test</span>
            </button>

            <button
              onClick={() => printBill(demoOrder)}
              disabled={isPrinting}
              className="p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.97]"
              style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}
            >
              <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-cream-200)" }}>
                <Receipt size={18} style={{ color: "var(--color-success, #1B8A5A)" }} />
              </span>
              <span className="font-bold text-xs uppercase tracking-wider" style={{ color: "var(--color-brown-900)" }}>Print Bill</span>
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>POST /api/printer/bill</span>
            </button>

            <button
              onClick={() => printKOT(demoOrder)}
              disabled={isPrinting}
              className="p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.97]"
              style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}
            >
              <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-cream-200)" }}>
                <Utensils size={18} style={{ color: "#1D4ED8" }} />
              </span>
              <span className="font-bold text-xs uppercase tracking-wider" style={{ color: "var(--color-brown-900)" }}>Print KOT</span>
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>POST /api/printer/kot</span>
            </button>
          </div>
        </div>

        {/* Available Hardware Serial Ports List */}
        <div className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
              <Layers size={16} style={{ color: "var(--color-orange-500)" }} /> Detected Hardware Serial Ports
            </h3>
            <button
              onClick={detectPorts}
              disabled={isLoadingPorts}
              className="text-[11px] font-bold flex items-center gap-1.5"
              style={{ color: "var(--color-orange-600)" }}
            >
              <RefreshCcw size={12} className={isLoadingPorts ? "animate-spin" : ""} />
              Rescan Ports
            </button>
          </div>

          {detectedPorts.length > 0 ? (
            <div className="space-y-1.5">
              {detectedPorts.map((p) => (
                <div
                  key={p.path}
                  className="p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all"
                  style={{
                    background: p.path === port ? "var(--color-cream-100)" : "var(--color-cream-50, #fff)",
                    border: `1px solid ${p.path === port ? "var(--color-orange-500)" : "var(--color-border-light)"}`,
                  }}
                >
                  <div className="min-w-0">
                    <span className="font-mono font-bold block truncate" style={{ color: "var(--color-brown-900)" }}>{p.path}</span>
                    <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                      {p.manufacturer || "Generic Serial Device"} {p.friendlyName ? `· ${p.friendlyName}` : ""}
                    </span>
                  </div>

                  {p.path === port ? (
                    <span
                      className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg self-start sm:self-auto flex-shrink-0"
                      style={{ background: "var(--color-orange-500)", color: "white" }}
                    >
                      Active Port
                    </span>
                  ) : (
                    <button
                      onClick={() => updateConfig(p.path, baudRate)}
                      className="px-3 py-1 text-[11px] font-bold rounded-lg self-start sm:self-auto flex-shrink-0"
                      style={{ background: "var(--color-brown-900)", color: "white" }}
                    >
                      Use This Port
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search size={26} style={{ color: "var(--color-text-muted)" }} />}
              title="No Ports Detected"
              description="Plug in a USB thermal printer and click Rescan Ports."
            />
          )}
        </div>

        {/* Setup Guide */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--color-brown-900)", color: "#E7DFD3" }}>
          <h3 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-orange-400, #FBBF24)" }}>
            <Terminal size={16} />
            Commercial POS Configuration Info
          </h3>

          <ul className="list-disc list-inside space-y-1.5 text-xs" style={{ color: "#D8CFC0" }}>
            <li>Settings persist to <code className="font-mono" style={{ color: "var(--color-orange-400, #FBBF24)" }}>server/src/config/printer.json</code>.</li>
            <li>Logs events to <code className="font-mono" style={{ color: "var(--color-orange-400, #FBBF24)" }}>server/logs/printer.log</code> (receipt contents are never stored).</li>
            <li>Compatible with macOS (<code className="font-mono" style={{ color: "var(--color-orange-400, #FBBF24)" }}>/dev/cu.*</code>), Windows (<code className="font-mono" style={{ color: "var(--color-orange-400, #FBBF24)" }}>COM1-COM9</code>), and Linux (<code className="font-mono" style={{ color: "var(--color-orange-400, #FBBF24)" }}>/dev/ttyUSB*</code>).</li>
            <li>Auto-reconnect worker automatically recovers connection if the USB cable is unplugged.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function MetricRow({ label, value, valueColor, mono }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <span className={`font-bold ${mono ? "font-mono" : ""}`} style={{ color: valueColor || "var(--color-brown-900)" }}>
        {value}
      </span>
    </div>
  );
}
