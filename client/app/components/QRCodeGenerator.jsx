"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { generateQRDataUrl, buildTableUrl } from "../lib/posterUtils";

/**
 * Renders a single table's QR code as an image.
 *
 * Security note: for a table in "secure mode" whose raw token isn't known
 * client-side (the server only ever stores its hash), there is nothing
 * valid to render — `locked` shows a placeholder instead of a broken/wrong
 * QR code. The only way to get a live preview again is to regenerate.
 */
export default function QRCodeGenerator({ slug, table, token, locked = false, size = 160 }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    if (locked) {
      setDataUrl(null);
      return undefined;
    }
    let active = true;
    generateQRDataUrl(buildTableUrl(slug, table.code, token)).then((url) => {
      if (active) setDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [slug, table.code, token, locked]);

  if (locked) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed"
        style={{ width: size, height: size, borderColor: "var(--color-border-light)", color: "var(--color-text-muted)" }}
      >
        <Lock size={20} />
        <span className="text-[9px] font-bold uppercase tracking-wide text-center px-2">Regenerate to view</span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className="animate-pulse rounded-lg"
        style={{ width: size, height: size, background: "var(--color-cream-200)" }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL, next/image doesn't apply
    <img
      src={dataUrl}
      alt={`QR code for table ${table.code}`}
      width={size}
      height={size}
      className="rounded-lg border"
      style={{ borderColor: "var(--color-border-light)" }}
    />
  );
}
