"use client";

import { useState } from "react";
import { Receipt, ChefHat, ImageIcon, AlignLeft, Ruler, Loader2 } from "lucide-react";
import DashboardHeader from "../../../components/admin/DashboardHeader";
import PrinterNav from "../../../components/admin/PrinterNav";
import { useRestaurant } from "../../../components/RestaurantContext";
import { DEMO_RESTAURANT } from "../../../lib/branding";
import { PrintService } from "../../../lib/printer/PrintService";
import { usePrinterSettings } from "../../../lib/printer/usePrinterSettings";
import { buildSampleReceiptData } from "../../../lib/printer/receiptData";
import toast from "react-hot-toast";

const ADAPTER_CHOICES = [
  { value: "", label: "Use configured printer (with fallback)" },
  { value: "THERMAL_AGENT", label: "Thermal Agent only" },
  { value: "NETWORK", label: "Network Printer only" },
  { value: "BLUETOOTH", label: "Bluetooth only" },
  { value: "BROWSER", label: "Browser Print only" },
  { value: "PDF", label: "PDF only" },
];

export default function TestPrintPage() {
  const { restaurant } = useRestaurant();
  const { settings } = usePrinterSettings();
  const branding = restaurant || DEMO_RESTAURANT;
  const [forceAdapter, setForceAdapter] = useState("");
  const [busy, setBusy] = useState(null);

  const run = async (key, options) => {
    setBusy(key);
    try {
      const outcome = await PrintService.print({
        ...options,
        settings,
        forceAdapter: forceAdapter || undefined,
      });
      if (outcome.success) {
        toast.success(`Sent via ${outcome.adapterUsed?.replace("_", " ")}${outcome.fellBack ? " (fell back)" : ""}`);
      } else {
        toast.error(outcome.attempts.map((a) => `${a.adapter}: ${a.error}`).join(" · ") || "Test print failed.");
      }
    } finally {
      setBusy(null);
    }
  };

  const tests = [
    {
      key: "bill",
      icon: Receipt,
      label: "Print Sample Bill",
      run: () => run("bill", { documentType: "BILL", data: buildSampleReceiptData("BILL", branding) }),
    },
    {
      key: "kot",
      icon: ChefHat,
      label: "Print Sample KOT",
      run: () => run("kot", { documentType: "KOT", data: buildSampleReceiptData("KOT", branding) }),
    },
    {
      key: "logo",
      icon: ImageIcon,
      label: "Print Logo Test",
      run: () =>
        run("logo", {
          documentType: "TEST",
          data: {
            ...buildSampleReceiptData("KOT", branding),
            title: "Logo Test",
            items: [],
            notes: branding?.logo ? null : "No logo uploaded yet — add one in Settings → Branding.",
          },
        }),
    },
    {
      key: "alignment",
      icon: AlignLeft,
      label: "Print Alignment Test",
      run: () =>
        run("alignment", {
          documentType: "TEST",
          data: {
            ...buildSampleReceiptData("KOT", branding),
            title: "Alignment Test",
            items: [
              { name: "Left-aligned name column", quantity: 1, price: 0, isVeg: true, total: 0 },
              { name: "A much longer item name to test wrapping behavior", quantity: 12, price: 0, isVeg: false, total: 0 },
              { name: "Short", quantity: 999, price: 0, isVeg: null, total: 0 },
            ],
            notes: "Check that item names, quantities, and columns line up correctly.",
          },
        }),
    },
    {
      key: "width",
      icon: Ruler,
      label: `Paper Width Test (${settings.billPaperWidth})`,
      run: () =>
        run("width", {
          documentType: "TEST",
          data: {
            ...buildSampleReceiptData("KOT", branding),
            title: `${settings.billPaperWidth} Width Test`,
            items: [{ name: "0123456789ABCDEF0123456789ABCDEF", quantity: 1, price: 0, isVeg: null, total: 0 }],
            notes: `This receipt is formatted for ${settings.billPaperWidth} paper — verify no text is cut off.`,
          },
        }),
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <DashboardHeader title="Test Print" subtitle="Verify your printer setup" />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <PrinterNav active="/admin/printer/test" />

        <section className="rounded-2xl p-4 border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
            Force a specific method (optional)
          </label>
          <select className="input" value={forceAdapter} onChange={(e) => setForceAdapter(e.target.value)}>
            {ADAPTER_CHOICES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tests.map((t) => (
            <button
              key={t.key}
              onClick={t.run}
              disabled={busy === t.key}
              className="p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2"
              style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-cream-200)" }}>
                {busy === t.key ? <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-orange-500)" }} /> : <t.icon size={18} style={{ color: "var(--color-orange-500)" }} />}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-brown-900)" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
