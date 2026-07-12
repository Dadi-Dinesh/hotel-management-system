"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, QrCode, Clock, Star, Camera } from "lucide-react";
import Link from "next/link";
import api from "./lib/api";
import toast from "react-hot-toast";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("scan"); // "scan" or "manual"
  const [manualInput, setManualInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const qrScannerRef = useRef(null);

  const extractTableCode = (scannedText) => {
    if (!scannedText) return null;
    const text = scannedText.trim();
    
    // Pattern 1: URL structure containing /table/T01 or /table/1
    const urlMatch = text.match(/\/table\/([A-Za-z0-9-_]+)/i);
    if (urlMatch && urlMatch[1]) {
      const raw = urlMatch[1].toUpperCase();
      if (/^\d+$/.test(raw)) {
        const num = parseInt(raw, 10);
        if (num >= 1 && num <= 12) {
          return `T${String(num).padStart(2, "0")}`;
        }
      }
      return raw;
    }
    
    // Pattern 2: Raw number like "1" or "01"
    if (/^\d+$/.test(text)) {
      const num = parseInt(text, 10);
      if (num >= 1 && num <= 12) {
        return `T${String(num).padStart(2, "0")}`;
      }
    }
    
    // Pattern 3: Code pattern like "T01" or "T1" or "t01"
    const codeMatch = text.match(/^T(\d+)$/i);
    if (codeMatch && codeMatch[1]) {
      const num = parseInt(codeMatch[1], 10);
      if (num >= 1 && num <= 12) {
        return `T${String(num).padStart(2, "0")}`;
      }
    }

    // Pattern 4: General alphanumeric code
    if (/^[A-Z0-9-_]+$/i.test(text)) {
      return text.toUpperCase();
    }

    return null;
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
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
      
      // Delay slightly to ensure element with ID is in DOM
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode("qr-reader");
          qrScannerRef.current = scanner;
          
          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              }
            },
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
            (errorMessage) => {
              // Ignore debug messages
            }
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

  const launchGoogleLens = () => {
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent);

    if (isAndroid) {
      window.location.href = "intent://#Intent;scheme=googleapp;package=com.google.android.googlequicksearchbox;component=com.google.android.googlequicksearchbox/com.google.android.apps.search.lens.LensActivity;end";
    } else if (isIOS) {
      window.location.href = "google://lens";
      setTimeout(() => {
        window.location.href = "https://lens.google.com/";
      }, 2000);
    } else {
      window.location.href = "https://lens.google.com/";
    }
  };

  // Stop scanner if switching tabs
  useEffect(() => {
    if (activeTab !== "scan") {
      stopScanner();
    }
  }, [activeTab]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch((err) => console.error("Error stopping scanner on unmount", err));
      }
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
      console.error(err);
      setError(err.response?.data?.message || "Table not found. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-surface)" }}
    >
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center border-b" style={{ borderColor: "var(--color-brown-900)" }}>
        {/* Logo */}
        <div
          className="w-24 h-24 border-2 flex items-center justify-center mb-8"
          style={{
            background: "var(--color-orange-500)",
            borderColor: "var(--color-brown-900)",
          }}
        >
          <UtensilsCrossed size={48} color="white" />
        </div>

        <h1
          className="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tighter"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-brown-900)",
          }}
        >
          Nookambika Dhaba
        </h1>

        <p
          className="text-lg md:text-xl font-bold uppercase tracking-widest mb-12"
          style={{
            color: "var(--color-brown-900)",
            fontFamily: "var(--font-heading)",
          }}
        >
          Authentic Indian Cuisine
        </p>

        {/* Start Dining Card (Scan QR / Manual Input) */}
        <div
          className="border-2 p-6 max-w-md w-full mb-12 text-left space-y-6"
          style={{
            borderColor: "var(--color-brown-900)",
            background: "var(--color-surface)",
          }}
        >
          <h2
            className="text-xl font-black uppercase tracking-widest text-center"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-brown-900)",
            }}
          >
            Start Dining
          </h2>

          {/* Toggle Tabs */}
          <div className="grid grid-cols-2 gap-2 border-b-2 pb-4" style={{ borderColor: "var(--color-brown-900)" }}>
            <button
              onClick={() => {
                setActiveTab("scan");
                setError("");
              }}
              className={`py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border ${
                activeTab === "scan"
                  ? "bg-brown-900 text-white border-brown-900"
                  : "bg-transparent text-brown-900 border-transparent hover:bg-cream-100"
              }`}
              style={{
                fontFamily: "var(--font-heading)",
              }}
            >
              Scan Table QR
            </button>
            <button
              onClick={() => {
                setActiveTab("manual");
                setError("");
              }}
              className={`py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border ${
                activeTab === "manual"
                  ? "bg-brown-900 text-white border-brown-900"
                  : "bg-transparent text-brown-900 border-transparent hover:bg-cream-100"
              }`}
              style={{
                fontFamily: "var(--font-heading)",
              }}
            >
              Enter Table #
            </button>
          </div>

          {/* Scan QR Content */}
          {activeTab === "scan" && (
            <div className="space-y-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-brown-900">
                Scan your table QR code using Google Lens or your browser camera
              </p>
              
              <div className="flex flex-col gap-3 max-w-[280px] mx-auto py-2">
                <button
                  type="button"
                  onClick={launchGoogleLens}
                  className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #4285F4 0%, #34A853 25%, #FBBC05 50%, #EA4335 100%)",
                    color: "white",
                    border: "none",
                  }}
                >
                  <Camera size={18} />
                  Scan with Google Lens
                </button>

                <div className="flex items-center my-1.5">
                  <div className="flex-1 border-t" style={{ borderColor: "var(--color-brown-900)" }} />
                  <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-brown-900">OR</span>
                  <div className="flex-1 border-t" style={{ borderColor: "var(--color-brown-900)" }} />
                </div>

                {scanning ? (
                  <div 
                    className="relative aspect-square w-full border-2 flex flex-col items-center justify-center overflow-hidden bg-cream-100 mb-2"
                    style={{ borderColor: "var(--color-brown-900)" }}
                  >
                    <div id="qr-reader" className="w-full h-full"></div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startScanner}
                    className="btn-secondary w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Camera size={14} />
                    Use Browser Camera
                  </button>
                )}

                {scanning && (
                  <button
                    type="button"
                    onClick={stopScanner}
                    className="btn-secondary w-full py-2 text-xs font-bold uppercase tracking-wider"
                  >
                    Cancel Browser Scan
                  </button>
                )}
              </div>

              {error && (
                <div className="p-3 border text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border-red-200">
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

          {/* Manual Table Content */}
          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Enter Table Number (1-12) or Code (T01)
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. 5 or T05"
                  className="input uppercase font-bold text-center text-lg tracking-widest"
                  maxLength={10}
                  required
                />
              </div>

              {error && (
                <div className="p-3 border text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border-red-200">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={verifying}
                className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider"
              >
                {verifying ? "VERIFYING..." : "START ORDERING"}
              </button>
            </form>
          )}
        </div>

        {/* QR instruction */}
        <div
          className="border-2 p-8 max-w-md w-full mb-12 text-left"
          style={{
            borderColor: "var(--color-brown-900)",
            background: "var(--color-surface)",
          }}
        >
          <div className="flex items-center gap-4 mb-6">
            <QrCode size={32} style={{ color: "var(--color-orange-500)" }} />
            <h2
              className="text-xl font-bold uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-brown-900)",
              }}
            >
              How to Order
            </h2>
          </div>
          <div className="space-y-4">
            {[
              { step: "1", text: "Scan the QR code on your table" },
              { step: "2", text: "Browse our delicious menu" },
              { step: "3", text: "Add items and place your order" },
              { step: "4", text: "Enjoy your meal! 🍛" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4">
                <span
                  className="w-8 h-8 flex items-center justify-center font-black border"
                  style={{
                    background: "var(--color-orange-500)",
                    borderColor: "var(--color-brown-900)",
                    color: "white",
                  }}
                >
                  {item.step}
                </span>
                <span
                  className="font-bold text-sm uppercase tracking-wider"
                  style={{ color: "var(--color-brown-900)" }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { icon: <QrCode size={24} />, label: "QR Ordering" },
            { icon: <Clock size={24} />, label: "Quick Service" },
            { icon: <Star size={24} />, label: "Best Quality" },
          ].map((feat) => (
            <div
              key={feat.label}
              className="flex flex-col items-center gap-3 p-6 border-2"
              style={{
                borderColor: "var(--color-brown-900)",
              }}
            >
              <span style={{ color: "var(--color-orange-500)" }}>
                {feat.icon}
              </span>
              <span
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: "var(--color-brown-900)" }}
              >
                {feat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Staff Login Links */}
      <footer className="py-8 bg-brown-900 text-center" style={{ background: "var(--color-brown-900)" }}>
        <div className="flex items-center justify-center gap-8 mb-4">
          <Link
            href="/captain/login"
            className="text-xs font-bold uppercase tracking-widest text-white hover:text-orange-500 transition-colors"
          >
            Captain Login
          </Link>
          <span className="text-white opacity-30">|</span>
          <Link
            href="/admin/login"
            className="text-xs font-bold uppercase tracking-widest text-white hover:text-orange-500 transition-colors"
          >
            Admin Login
          </Link>
        </div>
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--color-cream-300)" }}
        >
          © 2024 Nookambika Dhaba
        </p>
      </footer>
    </div>
  );
}
