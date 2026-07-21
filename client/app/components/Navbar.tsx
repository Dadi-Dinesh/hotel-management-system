"use client";

import React from "react";
import Image from "next/image";
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
      className="sticky top-0 z-50 border-b border-brown-900 w-full"
      style={{ background: "var(--color-surface)" }}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border transition-colors flex-shrink-0"
              style={{
                borderColor: "var(--color-brown-900)",
                color: "var(--color-brown-900)",
              }}
            >
              ←
            </Link>
          )}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div
              className="relative w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full overflow-hidden border-2 shadow-xs"
              style={{
                borderColor: "var(--color-orange-500)",
                background: "var(--color-surface)",
              }}
            >
              <Image
                src="/dhaba-logo.jpg"
                alt="Sree Nookambika Dhaba Logo"
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1
                className="text-sm sm:text-base md:text-lg font-bold leading-tight uppercase tracking-wider truncate"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-brown-900)",
                }}
              >
                {title || "Nookambika Dhaba"}
              </h1>
              {subtitle && (
                <p
                  className="text-[10px] sm:text-xs font-medium uppercase tracking-widest mt-0.5 truncate"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
        {rightContent && <div className="flex-shrink-0 ml-1 sm:ml-2">{rightContent}</div>}
      </div>
    </header>
  );
}
