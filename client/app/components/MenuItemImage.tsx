"use client";

import Image from "next/image";
import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";

interface MenuItemImageProps {
  src?: string | null;
  alt: string;
}

export default function MenuItemImage({ src, alt }: MenuItemImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Elegant fallback placeholder when image is missing or failed to load
  const FallbackPlaceholder = () => (
    <div
      className="w-full h-full flex flex-col items-center justify-center rounded-lg"
      style={{
        background: "linear-gradient(135deg, var(--color-cream-200), var(--color-cream-300))",
        border: "1px solid var(--color-cream-300)",
      }}
    >
      <UtensilsCrossed
        size={24}
        className="text-[var(--color-brown-800)] opacity-40"
      />
    </div>
  );

  return (
    <div
      className="w-20 h-20 sm:w-24 sm:h-24 relative flex-shrink-0 rounded-lg overflow-hidden border transition-all duration-300"
      style={{ borderColor: "var(--color-brown-900)" }}
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
          sizes="(max-width: 640px) 80px, 96px"
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
