"use client";

import React from "react";
import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";

interface NavbarProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  rightContent?: React.ReactNode;
}

export default function Navbar({
  title,
  subtitle,
  backHref,
  rightContent,
}: NavbarProps) {
  return (
    <header
      className="sticky top-0 z-50 border-b border-brown-900"
      style={{ background: "var(--color-surface)" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center justify-center w-10 h-10 border transition-colors"
              style={{
                borderColor: "var(--color-brown-900)",
                color: "var(--color-brown-900)",
              }}
            >
              ←
            </Link>
          )}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10"
              style={{
                background: "var(--color-orange-500)",
                color: "var(--color-surface)",
              }}
            >
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h1
                className="text-lg font-bold leading-tight uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-brown-900)",
                }}
              >
                {title || "Nookambika Dhaba"}
              </h1>
              {subtitle && (
                <p
                  className="text-xs font-medium uppercase tracking-widest mt-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
        {rightContent && <div>{rightContent}</div>}
      </div>
    </header>
  );
}
