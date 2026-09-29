"use client";

import { useState, useEffect } from "react";
import {
  Receipt,
  ChefHat,
  Ruler,
  Copy,
  Wifi,
  Save,
} from "lucide-react";
import DashboardHeader from "../../../components/admin/DashboardHeader";
import PrinterNav from "../../../components/admin/PrinterNav";
import { usePrinterSettings } from "../../../lib/printer/usePrinterSettings";
import { networkAdapter } from "../../../lib/printer/adapters/networkAdapter";
import toast from "react-hot-toast";

const ADAPTER_OPTIONS = [
  { value: "BROWSER", label: "Browser Print", hint: "Works everywhere — opens the print dialog" },
  { value: "THERMAL_AGENT", label: "Thermal (USB/Serial Agent)", hint: "TVS, Epson, Rongta, XPrinter, POS-58/80, Sunmi" },
  { value: "NETWORK", label: "Network Printer (IP)", hint: "Any ESC/POS printer on your Wi-Fi/LAN" },
  { value: "BLUETOOTH", label: "Bluetooth Printer", hint: "Chrome/Edge only — pairs from the browser" },
  { value: "PDF", label: "PDF (Download/Print)", hint: "Good for regular inkjet/laser printers" },
];

const PAPER_WIDTHS = ["58mm", "80mm", "A4"];

export default function PrinterSettingsPage() {
  const { settings, loading, saving, saveSettings } = usePrinterSettings();
  const [form, setForm] = useState(settings);
  const [testingNetwork, setTestingNetwork] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = async (e) => {
    e.preventDefault();
    const ok = await saveSettings(form);
    if (ok) toast.success("Print settings saved.");
    else toast.error("Failed to save print settings.");
  };

  const handleTestNetwork = async () => {
    if (!form.networkPrinterIp) {
      toast.error("Enter a network printer IP first.");
      return;
    }
    setTestingNetwork(true);
    try {
      const res = await networkAdapter.testConnection(form.networkPrinterIp, form.networkPrinterPort || 9100);
      if (res.success) toast.success("Network printer reachable! ✅");
      else toast.error(res.error || "Could not reach that printer.");
    } finally {
      setTestingNetwork(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-surface)" }}>
        <div className="animate-pulse text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
          Loading print settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <DashboardHeader title="Print Settings" subtitle="Universal Print Engine" />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <PrinterNav active="/admin/printer/settings" />

        <form onSubmit={handleSave} className="space-y-6 mt-6">
          <Section icon={Receipt} title="Bill Printer">
            <AdapterPicker value={form.billPrinterType} onChange={(v) => update({ billPrinterType: v })} />
            <PaperWidthPicker value={form.billPaperWidth} onChange={(v) => update({ billPaperWidth: v })} />
          </Section>

          <Section icon={ChefHat} title="Kitchen Printer">
            <AdapterPicker value={form.kitchenPrinterType} onChange={(v) => update({ kitchenPrinterType: v })} />
            <PaperWidthPicker value={form.kotPaperWidth} onChange={(v) => update({ kotPaperWidth: v })} />
          </Section>

          <Section icon={Wifi} title="Network Printer (IP:Port)">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>IP Address</Label>
                <input className="input" placeholder="192.168.1.120" value={form.networkPrinterIp || ""} onChange={(e) => update({ networkPrinterIp: e.target.value })} />
              </div>
              <div>
                <Label>Port</Label>
                <input className="input" type="number" value={form.networkPrinterPort || 9100} onChange={(e) => update({ networkPrinterPort: Number(e.target.value) })} />
              </div>
            </div>
            <button
              type="button"
              onClick={handleTestNetwork}
              disabled={testingNetwork}
              className="btn-secondary text-xs font-bold uppercase tracking-wider px-4 py-2 mt-2"
            >
              {testingNetwork ? "Testing..." : "Test Connection"}
            </button>
            <p className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
              Requires the local Printer Agent to be online — it&apos;s the one with LAN access to test and print to this printer.
            </p>
          </Section>

          <Section icon={Copy} title="Copies & Auto Print">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Copies per print</Label>
                <input className="input" type="number" min={1} max={5} value={form.copies} onChange={(e) => update({ copies: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2 mt-3">
              <ToggleRow label="Auto-print KOT when an order is accepted" checked={form.autoPrintKOT} onChange={(v) => update({ autoPrintKOT: v })} />
              <ToggleRow label="Auto-print Bill when a customer requests it" checked={form.autoPrintBill} onChange={(v) => update({ autoPrintBill: v })} />
            </div>
            <p className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
              Auto-print is silent and only works through the Thermal/Network agent — it never opens a browser dialog, and simply does nothing if the agent is offline.
            </p>
          </Section>

          <button type="submit" disabled={saving} className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <Save size={16} /> {saving ? "Saving..." : "Save Print Settings"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
      <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
        <Icon size={16} style={{ color: "var(--color-orange-500)" }} /> {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
      {children}
    </label>
  );
}

function AdapterPicker({ value, onChange }) {
  return (
    <div className="space-y-2">
      {ADAPTER_OPTIONS.map((opt) => (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all"
          style={{
            borderColor: value === opt.value ? "var(--color-orange-500)" : "var(--color-border-light)",
            background: value === opt.value ? "var(--color-cream-100)" : "white",
          }}
        >
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--color-brown-900)" }}>{opt.label}</p>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{opt.hint}</p>
          </div>
          <span
            className="w-4 h-4 rounded-full border-2 flex-shrink-0"
            style={{
              borderColor: value === opt.value ? "var(--color-orange-500)" : "var(--color-border-light)",
              background: value === opt.value ? "var(--color-orange-500)" : "transparent",
            }}
          />
        </button>
      ))}
    </div>
  );
}

function PaperWidthPicker({ value, onChange }) {
  return (
    <div>
      <Label>Paper Width</Label>
      <div className="grid grid-cols-3 gap-2">
        {PAPER_WIDTHS.map((w) => (
          <button
            type="button"
            key={w}
            onClick={() => onChange(w)}
            className="py-2 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
            style={{
              borderColor: value === w ? "var(--color-brown-900)" : "var(--color-border-light)",
              background: value === w ? "var(--color-brown-900)" : "white",
              color: value === w ? "white" : "var(--color-text-secondary)",
            }}
          >
            <Ruler size={11} /> {w}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 p-2.5 rounded-lg cursor-pointer" style={{ background: "var(--color-cream-100)" }}>
      <span className="text-xs font-semibold" style={{ color: "var(--color-brown-900)" }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="w-10 h-5.5 rounded-full relative transition-colors flex-shrink-0"
        style={{ background: checked ? "var(--color-orange-500)" : "var(--color-border-light)", height: 22, width: 40 }}
      >
        <span
          className="absolute top-0.5 rounded-full bg-white transition-all shadow"
          style={{ width: 18, height: 18, left: checked ? 20 : 2 }}
        />
      </button>
    </label>
  );
}
