"use client";

/**
 * Demo entry — lets a visitor try the live demo restaurant (Sree Nookambika
 * Family Dhaba) without any signup. This is the exact scan/manual-entry
 * flow that used to live on the root landing page (relocated, not
 * duplicated, when "/" became the marketing homepage in Phase 11) — same
 * QR-scanning logic, same table-code parsing, unchanged.
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, QrCode, ArrowRight } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { DEMO_RESTAURANT } from "../lib/branding";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";

export default function DemoPageClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("scan");
  const [manualInput, setManualInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const qrScannerRef = useRef(null);

  const extractTableCode = (scannedText) => {
    if (!scannedText) return null;
    const text = scannedText.trim();

    const urlMatch = text.match(/\/table\/([A-Za-z0-9-_]+)/i);
    if (urlMatch && urlMatch[1]) {
      const raw = urlMatch[1].toUpperCase();
      if (/^\d+$/.test(raw)) {
        const num = parseInt(raw, 10);
        if (num >= 1 && num <= 12) return `T${String(num).padStart(2, "0")}`;
      }
      return raw;
    }

    if (/^\d+$/.test(text)) {
      const num = parseInt(text, 10);
      if (num >= 1 && num <= 12) return `T${String(num).padStart(2, "0")}`;
    }

    const codeMatch = text.match(/^T(\d+)$/i);
    if (codeMatch && codeMatch[1]) {
      const num = parseInt(codeMatch[1], 10);
      if (num >= 1 && num <= 12) return `T${String(num).padStart(2, "0")}`;
    }

    if (/^[A-Z0-9-_]+$/i.test(text)) return text.toUpperCase();

    return null;
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) await qrScannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      qrScannerRef.current = null;
    }
    setScanning(false);
  };

  const startScanner = async () => {
    setError("");
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode("qr-reader");
          qrScannerRef.current = scanner;

          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: (width, height) => ({ width: Math.min(width, height) * 0.7, height: Math.min(width, height) * 0.7 }) },
            async (decodedText) => {
              const code = extractTableCode(decodedText);
              if (code) {
                await scanner.stop().catch((e) => console.error(e));
                qrScannerRef.current = null;
                setScanning(false);
                toast.success(`Table ${code} scanned successfully!`);
                router.push(`/table/${code}`);
              } else {
                setError("Invalid QR code. Please scan a valid table QR.");
              }
            },
            () => {}
          );
        } catch (err) {
          console.error("Scanner start error:", err);
          setScanning(false);
          if (err?.name === "NotAllowedError" || String(err).includes("permission")) {
            setError("Camera permission denied. Please allow camera access or enter table manually.");
          } else {
            setError("Unable to access camera. Please enter table manually.");
          }
        }
      }, 100);
    } catch (err) {
      console.error("Scanner import error:", err);
      setError("Failed to initialize scanner. Please enter table manually.");
      setScanning(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "scan") stopScanner();
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) qrScannerRef.current.stop().catch((err) => console.error("Error stopping scanner on unmount", err));
    };
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setVerifying(true);

    const formattedCode = extractTableCode(manualInput);
    if (!formattedCode) {
      setError("Please enter a valid table number (1-12) or table code (T01-T12).");
      setVerifying(false);
      return;
    }

    try {
      const res = await api.get(`/tables/${formattedCode}`);
      if (res.data.success) {
        router.push(`/table/${formattedCode}`);
      } else {
        setError("Table is currently unavailable.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Table not found. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface)" }}>
      <MarketingNav />

      <main className="flex-1 flex flex-col items-center px-6 py-14 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-lg w-full">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 border-2 text-xs font-bold uppercase tracking-widest rounded-full"
            style={{ borderColor: "var(--color-orange-500)", color: "var(--color-brown-900)", background: "var(--color-cream-100)" }}
          >
            <QrCode size={14} style={{ color: "var(--color-orange-500)" }} />
            No Signup Required
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Explore the Live Demo
          </h1>
          <p className="text-sm mb-10" style={{ color: "var(--color-text-secondary)" }}>
            Scan a table QR or enter a table number to experience {DEMO_RESTAURANT.name}&apos;s full customer ordering flow — exactly what your own guests would see.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="border-2 p-6 max-w-md w-full text-left space-y-6 rounded-2xl shadow-xl"
          style={{ borderColor: "var(--color-brown-900)", background: "var(--color-surface)" }}
        >
          <div className="grid grid-cols-2 gap-2 border-b-2 pb-4" style={{ borderColor: "var(--color-brown-900)" }}>
            <button
              onClick={() => { setActiveTab("scan"); setError(""); }}
              className={`py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border rounded-lg ${activeTab === "scan" ? "bg-brown-900 text-white border-brown-900" : "bg-transparent text-brown-900 border-transparent hover:bg-cream-100"}`}
            >
              Scan Table QR
            </button>
            <button
              onClick={() => { setActiveTab("manual"); setError(""); }}
              className={`py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border rounded-lg ${activeTab === "manual" ? "bg-brown-900 text-white border-brown-900" : "bg-transparent text-brown-900 border-transparent hover:bg-cream-100"}`}
            >
              Enter Table #
            </button>
          </div>

          {activeTab === "scan" && (
            <div className="space-y-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-brown-900">Scan your table QR code using your browser camera</p>
              <div className="flex flex-col gap-3 max-w-[280px] mx-auto py-2">
                {scanning ? (
                  <div className="relative aspect-square w-full border-2 flex flex-col items-center justify-center overflow-hidden bg-cream-100 mb-2 rounded-xl" style={{ borderColor: "var(--color-brown-900)" }}>
                    <div id="qr-reader" className="w-full h-full" />
                  </div>
                ) : (
                  <button onClick={startScanner} className="btn-secondary w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2" style={{ borderRadius: "0.75rem" }}>
                    <Camera size={14} /> Use Browser Camera
                  </button>
                )}
                {scanning && (
                  <button onClick={stopScanner} className="btn-secondary w-full py-2 text-xs font-bold uppercase tracking-wider" style={{ borderRadius: "0.75rem" }}>
                    Cancel Scan
                  </button>
                )}
              </div>
              {error && <div className="p-3 border text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border-red-200 rounded-lg">⚠️ {error}</div>}
            </div>
          )}

          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-secondary)" }}>
                  Enter Table Number (1-12) or Code (T01)
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. 5 or T05"
                  className="input uppercase font-bold text-center text-lg tracking-widest"
                  style={{ borderRadius: "0.75rem" }}
                  maxLength={10}
                  required
                />
              </div>
              {error && <div className="p-3 border text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border-red-200 rounded-lg">⚠️ {error}</div>}
              <button type="submit" disabled={verifying} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider" style={{ borderRadius: "0.75rem" }}>
                {verifying ? "VERIFYING..." : "START ORDERING"}
              </button>
            </form>
          )}
        </motion.div>

        <motion.a
          href="/apply"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-xs font-bold uppercase tracking-widest underline underline-offset-4 hover:opacity-70 transition-opacity flex items-center gap-1.5"
          style={{ color: "var(--color-brown-900)" }}
        >
          Own a restaurant? Apply for Your Restaurant <ArrowRight size={13} />
        </motion.a>
      </main>

      <MarketingFooter />
    </div>
  );
}
