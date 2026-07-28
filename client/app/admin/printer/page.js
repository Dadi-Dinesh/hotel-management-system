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
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
} from "lucide-react";
import { usePrinter } from "../../lib/printer/usePrinter";
import toast from "react-hot-toast";

export default function PrinterAdminPage() {
  const {
    status,
    isConnected,
    port,
    baudRate,
    kitchenMode,
    queueLength,
    queueMetrics,
    stats,
    lastConnected,
    lastPrinted,
    lastError,
    detectedPorts,
    isLoadingPorts,
    isPrinting,
    fetchStatus,
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

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
            <Printer size={26} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-brown-900">
              Commercial Thermal Printer Settings
            </h1>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              Node.js SerialPort POS Driver & Settings Manager
            </p>
          </div>
        </div>

        {/* Live Hardware Status Indicator */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest shadow-xs ${
            status === "CONNECTED"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : status === "CONNECTING"
              ? "bg-amber-50 border-amber-300 text-amber-800"
              : "bg-rose-50 border-rose-300 text-rose-800"
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              status === "CONNECTED"
                ? "bg-emerald-500 animate-pulse"
                : status === "CONNECTING"
                ? "bg-amber-500 animate-bounce"
                : "bg-rose-500"
            }`}
          />
          {status === "CONNECTED"
            ? "🟢 Connected"
            : status === "CONNECTING"
            ? "🟡 Reconnecting..."
            : "🔴 Disconnected"}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Left Column: Printer Settings Form & Hardware Connection */}
        <div className="space-y-6">
          {/* Settings Card */}
          <form onSubmit={handleSaveConfig} className="bg-white border-2 border-stone-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm font-black uppercase tracking-wider text-brown-900 mb-4 flex items-center gap-2">
              <Wifi size={18} className="text-amber-600" />
              Printer Hardware Configuration
            </h2>

            <div className="space-y-4 text-xs">
              {/* Port Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-stone-700">Hardware Serial Port:</label>
                  <button
                    type="button"
                    onClick={detectPorts}
                    disabled={isLoadingPorts}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <Search size={12} className={isLoadingPorts ? "animate-spin" : ""} />
                    Scan Ports
                  </button>
                </div>

                {detectedPorts.length > 0 ? (
                  <select
                    value={selectedPort}
                    onChange={(e) => setSelectedPort(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono text-xs font-bold text-brown-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
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
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono text-xs font-bold text-brown-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                )}
                <p className="text-[10px] text-stone-400 mt-1">
                  macOS: <code className="font-mono">/dev/cu.usbserial-10</code> | Windows: <code className="font-mono">COM3</code> | Linux: <code className="font-mono">/dev/ttyUSB0</code>
                </p>
              </div>

              {/* Baud Rate Selector */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">Serial Baud Rate:</label>
                <select
                  value={selectedBaud}
                  onChange={(e) => setSelectedBaud(Number(e.target.value))}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono text-xs font-bold text-brown-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value={9600}>9600 Baud (Standard Thermal Default)</option>
                  <option value={19200}>19200 Baud (High Speed HS-802)</option>
                  <option value={38400}>38400 Baud</option>
                  <option value={57600}>57600 Baud</option>
                  <option value={115200}>115200 Baud</option>
                </select>
              </div>

              {/* Kitchen Mode Selector */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">Kitchen Mode (KOT Copy Routing):</label>
                <select
                  value={selectedKitchenMode}
                  onChange={(e) => setSelectedKitchenMode(e.target.value)}
                  className="w-full p-2.5 bg-amber-50 border border-amber-300 rounded-xl font-mono text-xs font-black text-brown-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="LIVE">● LIVE MODE (1 Waiter KOT Copy per order - Kitchen uses screen)</option>
                  <option value="NORMAL">● NORMAL MODE (Kitchen dishes: 2 Copies | Beverages: 1 Copy)</option>
                </select>
                <p className="text-[10px] text-stone-500 mt-1 font-medium">
                  {selectedKitchenMode === "LIVE"
                    ? "LIVE MODE: Only 1 Waiter Copy is printed. Kitchen receives orders on WebSocket screen."
                    : "NORMAL MODE: Kitchen dishes (Starters, Curries, Fried Rice) print 2 copies (Chef + Waiter). Beverages & Ready items print 1 copy."}
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Save size={14} />
                  Save & Apply
                </button>

                <button
                  type="button"
                  onClick={reconnectPrinter}
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-all border border-stone-300 flex items-center justify-center gap-1"
                  title="Force Reconnect"
                >
                  <RefreshCcw size={14} />
                </button>
              </div>
            </div>
          </form>

          {/* Connection Info & Errors */}
          <div className="bg-white border-2 border-stone-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs">
            <h2 className="text-sm font-black uppercase tracking-wider text-brown-900 mb-1 flex items-center gap-2">
              <Activity size={18} className="text-amber-600" />
              Live Hardware Metrics
            </h2>

            <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
              <span className="text-stone-600">Connection Status:</span>
              <span className={`font-black uppercase text-[11px] ${status === "CONNECTED" ? "text-emerald-600" : status === "CONNECTING" ? "text-amber-600" : "text-rose-600"}`}>
                {status === "CONNECTED" ? "🟢 Online" : status === "CONNECTING" ? "🟡 Reconnecting" : "🔴 Offline"}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
              <span className="text-stone-600">Active USB Port:</span>
              <span className="font-mono font-bold text-brown-900">{port}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
              <span className="text-stone-600">Printer Name:</span>
              <span className="font-bold text-brown-900">
                {detectedPorts.find((p) => p.path === port)?.friendlyName ||
                  detectedPorts.find((p) => p.path === port)?.manufacturer ||
                  "HS-802UWB Thermal Printer"}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
              <span className="text-stone-600">Baud Rate:</span>
              <span className="font-mono font-bold text-brown-900">{baudRate} bps</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
              <span className="text-stone-600">Queue Length:</span>
              <span className="font-bold text-amber-700">{queueMetrics?.waitingJobs || 0} Pending Jobs</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
              <span className="text-stone-600">Total Printed:</span>
              <span className="font-bold text-emerald-700">{stats?.totalPrinted || 0} Receipts</span>
            </div>

            {lastPrinted && (
              <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                <span className="text-stone-600">Last Printed:</span>
                <span className="font-bold text-stone-800">{new Date(lastPrinted).toLocaleTimeString("en-IN")}</span>
              </div>
            )}

            {lastConnected && (
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] font-medium">
                Last connected: {new Date(lastConnected).toLocaleTimeString("en-IN")}
              </div>
            )}

            {lastError && (
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-[11px] font-medium break-words">
                <span className="font-bold block">Printer Error Notice:</span>
                {lastError}
              </div>
            )}
          </div>
        </div>

        {/* Center & Right Column: REST API Test Buttons & Port List */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border-2 border-stone-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-black uppercase tracking-wider text-brown-900 mb-2 flex items-center gap-2">
              <Cpu size={20} className="text-amber-600" />
              Serial ESC/POS Print Operations
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Sends 80mm ESC/POS binary print payloads directly to the Node.js serial service over <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono font-bold">{port}</code>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Test 1: Standard Test Printer Button */}
              <button
                onClick={printTest}
                disabled={isPrinting}
                className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 transition-all flex flex-col items-center justify-center text-center gap-2 group shadow-xs disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Printer size={20} />
                </div>
                <span className="font-black text-xs uppercase tracking-wider text-brown-900">
                  Test Print
                </span>
                <span className="text-[10px] text-stone-500">
                  POST /api/printer/test
                </span>
              </button>

              {/* Test 2: Full Customer Bill */}
              <button
                onClick={() => printBill(demoOrder)}
                disabled={isPrinting}
                className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-all flex flex-col items-center justify-center text-center gap-2 group shadow-xs disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Receipt size={20} />
                </div>
                <span className="font-black text-xs uppercase tracking-wider text-brown-900">
                  Print Bill
                </span>
                <span className="text-[10px] text-stone-500">
                  POST /api/printer/bill
                </span>
              </button>

              {/* Test 3: Kitchen Ticket KOT */}
              <button
                onClick={() => printKOT(demoOrder)}
                disabled={isPrinting}
                className="p-4 rounded-xl border-2 border-sky-300 bg-sky-50 hover:bg-sky-100 transition-all flex flex-col items-center justify-center text-center gap-2 group shadow-xs disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Utensils size={20} />
                </div>
                <span className="font-black text-xs uppercase tracking-wider text-brown-900">
                  Print KOT
                </span>
                <span className="text-[10px] text-stone-500">
                  POST /api/printer/kot
                </span>
              </button>
            </div>
          </div>

          {/* Available Hardware Serial Ports List */}
          <div className="bg-white border-2 border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-brown-900 flex items-center gap-2">
                <Layers size={18} className="text-amber-600" />
                Detected Hardware Serial Ports
              </h3>
              <button
                onClick={detectPorts}
                disabled={isLoadingPorts}
                className="px-3 py-1.5 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-stone-800 flex items-center gap-1.5"
              >
                <RefreshCcw size={12} className={isLoadingPorts ? "animate-spin" : ""} />
                Rescan Ports
              </button>
            </div>

            {detectedPorts.length > 0 ? (
              <div className="space-y-2">
                {detectedPorts.map((p) => (
                  <div
                    key={p.path}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                      p.path === port
                        ? "bg-amber-50 border-amber-400"
                        : "bg-stone-50 border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div>
                      <span className="font-mono font-black text-brown-900 block">{p.path}</span>
                      <span className="text-stone-500 text-[11px] font-medium">
                        {p.manufacturer || "Generic Serial Device"} {p.friendlyName ? `• ${p.friendlyName}` : ""}
                      </span>
                    </div>

                    {p.path === port ? (
                      <span className="px-2.5 py-1 bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg self-start sm:self-auto">
                        Active Port
                      </span>
                    ) : (
                      <button
                        onClick={() => updateConfig(p.path, baudRate)}
                        className="px-3 py-1 bg-stone-800 text-white text-[11px] font-bold rounded-lg hover:bg-stone-700 transition-all self-start sm:self-auto"
                      >
                        Use This Port
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-stone-500 border border-dashed border-stone-300 rounded-xl text-xs">
                No active serial devices detected on host. Plug in USB thermal printer and click <strong>Rescan Ports</strong>.
              </div>
            )}
          </div>

          {/* Setup Guide */}
          <div className="bg-stone-900 text-stone-200 rounded-2xl p-6 shadow-md border border-stone-800 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Terminal size={18} />
              Commercial POS Configuration Info
            </h3>

            <ul className="list-disc list-inside space-y-1.5 text-xs text-stone-300">
              <li>Settings dynamically persist to <code className="text-amber-400 font-mono">server/src/config/printer.json</code>.</li>
              <li>Logs events to <code className="text-amber-400 font-mono">server/logs/printer.log</code> (receipt contents are never stored).</li>
              <li>Compatible with macOS (<code className="text-amber-400 font-mono">/dev/cu.*</code>), Windows (<code className="text-amber-400 font-mono">COM1-COM9</code>), and Linux (<code className="text-amber-400 font-mono">/dev/ttyUSB*</code>).</li>
              <li>Auto-reconnect worker automatically recovers connection if USB cable is unplugged.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
