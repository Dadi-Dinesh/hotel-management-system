"use client";

const PADDING_CLASSES = {
  sm: "p-6",
  md: "p-8",
  lg: "p-8 sm:p-12",
};

/** Design-system card surface — soft border, 24px radius, gentle elevation. */
export default function Card({
  as: Tag = "div",
  padding = "md",
  hover = false,
  className = "",
  style = {},
  children,
  ...props
}) {
  return (
    <Tag
      className={`${hover ? "ss-card-hover" : ""} ${PADDING_CLASSES[padding] ?? PADDING_CLASSES.md} ${className}`}
      style={{
        background: "var(--ss-surface)",
        border: "1px solid var(--ss-border)",
        borderRadius: "var(--ss-radius-card)",
        boxShadow: "var(--ss-shadow-sm)",
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}
