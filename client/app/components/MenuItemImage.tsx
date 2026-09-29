"use client";

import Image from "next/image";
import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";

interface MenuItemImageProps {
  src?: string | null;
  alt: string;
  onClick?: () => void;
  /** "thumbnail" (default, existing compact row size) or "large" (premium card image) */
  variant?: "thumbnail" | "large";
}

const VARIANT_STYLES = {
  thumbnail: {
    wrapperClass: "w-[72px] h-[72px] sm:w-24 sm:h-24 flex-shrink-0 rounded-lg",
    sizes: "(max-width: 640px) 72px, 96px",
    iconSize: 20,
  },
  large: {
    wrapperClass: "w-full aspect-[4/3] rounded-t-2xl",
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
    iconSize: 40,
  },
};

function FallbackPlaceholder({ variant, iconSize }: { variant: "thumbnail" | "large"; iconSize: number }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{
        background: "var(--ss-bg, var(--color-cream-200))",
        border: variant === "thumbnail" ? "1px solid var(--ss-border, var(--color-cream-300))" : "none",
      }}
    >
      <UtensilsCrossed
        size={iconSize}
        style={{ color: "var(--ss-secondary, var(--color-brown-800))", opacity: 0.4 }}
      />
    </div>
  );
}

export default function MenuItemImage({ src, alt, onClick, variant = "thumbnail" }: MenuItemImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={`relative overflow-hidden border transition-all duration-300 ${styles.wrapperClass}`}
      style={{
        borderColor: variant === "large" ? "transparent" : "var(--ss-border, var(--color-brown-900))",
        cursor: onClick ? "pointer" : "default",
        transform: "scale(1)",
        transition: "transform 0.15s ease, border-color 0.15s ease",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick && variant === "thumbnail") (e.currentTarget as HTMLDivElement).style.transform = "scale(1.06)";
      }}
      onMouseLeave={(e) => {
        if (onClick && variant === "thumbnail") (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
      }}
      onMouseDown={(e) => {
        if (onClick && variant === "thumbnail") (e.currentTarget as HTMLDivElement).style.transform = "scale(0.95)";
      }}
      onMouseUp={(e) => {
        if (onClick && variant === "thumbnail") (e.currentTarget as HTMLDivElement).style.transform = "scale(1.06)";
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && e.key === "Enter") onClick();
      }}
      aria-label={onClick ? `View details for ${alt}` : undefined}
    >
      {/* Loading Skeleton — shimmer sweep instead of a flat pulse */}
      {isLoading && !hasError && src && (
        <div className="absolute inset-0 ss-shimmer" />
      )}

      {/* Optimized Lazy-loaded Image */}
      {src && !hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={styles.sizes}
          className={`object-cover transition-all duration-300 ${
            isLoading ? "scale-105 blur-sm" : "scale-100 blur-0"
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        <FallbackPlaceholder variant={variant} iconSize={styles.iconSize} />
      )}
    </div>
  );
}
