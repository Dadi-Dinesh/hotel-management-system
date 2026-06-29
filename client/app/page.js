"use client";

import { UtensilsCrossed, QrCode, Clock, Star } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
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
