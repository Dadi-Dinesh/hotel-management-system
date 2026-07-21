"use client";

import Image from "next/image";
import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";

interface MenuItemImageProps {
  src?: string | null;
  alt: string;
  onClick?: () => void;
}

export default function MenuItemImage({ src, alt, onClick }: MenuItemImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const FallbackPlaceholder = () => (
    <div
      className="w-full h-full flex flex-col items-center justify-center rounded-lg"
      style={{
        background: "linear-gradient(135deg, var(--color-cream-200), var(--color-cream-300))",
        border: "1px solid var(--color-cream-300)",
      }}
    >
      <UtensilsCrossed
        size={20}
        className="sm:w-6 sm:h-6 text-[var(--color-brown-800)] opacity-40"
      />
    </div>
  );

  return (
    <div
      className="w-[72px] h-[72px] sm:w-24 sm:h-24 relative flex-shrink-0 rounded-lg overflow-hidden border transition-all duration-300"
      style={{
        borderColor: "var(--color-brown-900)",
        cursor: onClick ? "pointer" : "default",
        transform: "scale(1)",
        transition: "transform 0.15s ease, border-color 0.15s ease",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.transform = "scale(1.06)";
      }}
      onMouseLeave={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
      }}
      onMouseDown={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.transform = "scale(0.95)";
      }}
      onMouseUp={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.transform = "scale(1.06)";
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && e.key === "Enter") onClick();
      }}
      aria-label={onClick ? `View details for ${alt}` : undefined}
    >
      {/* Loading Skeleton */}
      {isLoading && !hasError && src && (
        <div className="absolute inset-0 skeleton animate-pulse rounded-lg" />
      )}

      {/* Optimized Lazy-loaded Image */}
      {src && !hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 72px, 96px"
          className={`object-cover rounded-lg transition-all duration-300 ${
            isLoading ? "scale-105 blur-sm" : "scale-100 blur-0"
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        <FallbackPlaceholder />
      )}
    </div>
  );
}
