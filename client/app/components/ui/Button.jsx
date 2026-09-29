"use client";

import Link from "next/link";

const VARIANT_STYLES = {
  primary: {
    background: "var(--ss-accent)",
    color: "var(--ss-on-accent)",
    border: "1px solid var(--ss-accent)",
  },
  secondary: {
    background: "var(--ss-surface)",
    color: "var(--ss-primary)",
    border: "1px solid var(--ss-border)",
  },
  "secondary-light": {
    background: "rgba(255, 253, 248, 0.12)",
    color: "#FFFDF8",
    border: "1px solid rgba(255, 253, 248, 0.35)",
  },
  ghost: {
    background: "transparent",
    color: "var(--ss-primary)",
    border: "1px solid transparent",
  },
};

const SIZE_CLASSES = {
  md: "px-6 py-4 text-sm gap-2",
  lg: "px-8 py-4 text-base gap-2.5",
};

/**
 * Design-system button. Renders a Next.js <Link> when `href` is given,
 * otherwise a <button>. `primary` and `secondary` share identical
 * padding/line-height at a given `size` so paired CTAs (e.g. the hero)
 * come out equal height and equal visual weight automatically.
 */
export default function Button({
  href,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  fullWidthOnMobile = false,
  className = "",
  style,
  children,
  ...props
}) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary;
  const Tag = href ? Link : "button";
  const tagProps = href ? { href } : { type: props.type ?? "button" };

  return (
    <Tag
      {...tagProps}
      {...props}
      data-variant={variant}
      className={`ss-btn inline-flex items-center justify-center font-semibold ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md} ${fullWidthOnMobile ? "w-full sm:w-auto" : ""} ${className}`}
      style={{
        ...styles,
        borderRadius: "var(--ss-radius-button)",
        boxShadow: variant === "primary" ? "var(--ss-shadow-sm)" : "none",
        ...style,
      }}
    >
      {Icon && iconPosition === "left" && <Icon size={18} strokeWidth={2.25} aria-hidden="true" />}
      {children}
      {Icon && iconPosition === "right" && <Icon size={18} strokeWidth={2.25} aria-hidden="true" />}
    </Tag>
  );
}
