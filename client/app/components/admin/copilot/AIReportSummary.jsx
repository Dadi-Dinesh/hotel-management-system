"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Copy, Download, Check } from "lucide-react";
import { fetchReport } from "../../../lib/insights/useAICopilot";
import { copySummaryToClipboard, downloadReportPDF } from "../../../lib/insights/reportExport";
import toast from "react-hot-toast";

const PERIODS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

/** AI-generated narrative report — Daily/Weekly/Monthly — built entirely
 * from the same real-data endpoints the AI Copilot dashboard panel uses. */
export default function AIReportSummary() {
  const [period, setPeriod] = useState("daily");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const data = await fetchReport(p);
      setReport(data);
    } catch {
      toast.error("Failed to generate AI report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  const handleCopy = async () => {
    if (!report) return;
    await copySummaryToClipboard(report);
    setCopied(true);
    toast.success("Summary copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      await downloadReportPDF(report);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl p-5 border flex flex-col gap-4" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-black text-sm uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
          <Sparkles size={16} style={{ color: "var(--color-orange-500)" }} /> AI Report Summary
        </h3>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
              style={{
                background: period === p.key ? "var(--color-brown-900)" : "white",
                color: period === p.key ? "white" : "var(--color-text-secondary)",
                borderColor: period === p.key ? "var(--color-brown-900)" : "var(--color-border-light)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-32 rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />
      ) : !report ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Failed to load report.</p>
      ) : (
        <>
          <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-100)" }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-secondary)" }}>{report.rangeLabel}</p>
            <ul className="space-y-1.5">
              {report.narrative.map((line, i) => (
                <li key={i} className="text-sm font-semibold leading-relaxed" style={{ color: "var(--color-brown-900)" }}>• {line}</li>
              ))}
            </ul>
          </div>

          {report.recommendations?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Suggestions</p>
              <ul className="space-y-1">
                {report.recommendations.map((r) => (
                  <li key={r.id} className="text-xs" style={{ color: "var(--color-text-secondary)" }}>- {r.text}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--color-border-light)" }}>
            <span className="text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
              Generated {new Date(report.generatedAt).toLocaleString("en-IN")}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border"
                style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)", background: "var(--color-cream-100)" }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy Summary"}
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white"
                style={{ background: "var(--color-brown-900)" }}
              >
                <Download size={13} /> {downloading ? "Preparing..." : "PDF"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
