"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Printer, ChevronDown } from "lucide-react";
import { exportToCSV, exportToPDF, printReport } from "../../lib/exportUtils";

/**
 * Reusable export dropdown — CSV / PDF / Print — for any tabular dataset.
 * columns: [{ key, label, value?: (row) => any }]
 */
export default function ExportButton({ filename, title, subtitle, columns, rows, disabled }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handle = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const isDisabled = disabled || !rows || rows.length === 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isDisabled}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)", background: "var(--color-cream-100)" }}
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1.5 w-44 rounded-xl border shadow-xl z-30 overflow-hidden"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border-light)" }}
          >
            <button
              disabled={busy}
              onClick={() => handle(() => exportToCSV(filename, columns, rows))}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-left hover:bg-cream-100 transition-colors disabled:opacity-50"
              style={{ color: "var(--color-brown-900)" }}
            >
              <FileSpreadsheet size={14} style={{ color: "var(--color-success)" }} /> CSV
            </button>
            <button
              disabled={busy}
              onClick={() => handle(() => exportToPDF(filename, title, columns, rows, subtitle))}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-left hover:bg-cream-100 transition-colors disabled:opacity-50 border-t"
              style={{ color: "var(--color-brown-900)", borderColor: "var(--color-border-light)" }}
            >
              <FileText size={14} style={{ color: "var(--color-danger)" }} /> PDF
            </button>
            <button
              disabled={busy}
              onClick={() => handle(() => printReport(title, columns, rows, subtitle))}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-left hover:bg-cream-100 transition-colors disabled:opacity-50 border-t"
              style={{ color: "var(--color-brown-900)", borderColor: "var(--color-border-light)" }}
            >
              <Printer size={14} style={{ color: "var(--color-text-muted)" }} /> Print
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
