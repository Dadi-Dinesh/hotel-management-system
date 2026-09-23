import type { ReceiptData, PaperWidth } from "../types";

function escapeHtml(str: string): string {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function vegIcon(isVeg: boolean | null | undefined, size: number): string {
  if (isVeg === null || isVeg === undefined) return "";
  const color = isVeg ? "#0a8a0a" : "#b91c1c";
  return `<span style="display:inline-block;width:${size}px;height:${size}px;border:1.5px solid ${color};border-radius:2px;vertical-align:middle;margin-right:3px;position:relative;"><span style="position:absolute;inset:2px;border-radius:50%;background:${color};"></span></span>`;
}

const PAGE_CSS: Record<PaperWidth, { size: string; width: string; fontBase: string }> = {
  "58mm": { size: "58mm auto", width: "54mm", fontBase: "10px" },
  "80mm": { size: "80mm auto", width: "76mm", fontBase: "12px" },
  A4: { size: "A4 portrait", width: "auto", fontBase: "14px" },
};

/**
 * Renders a Bill or KOT as print-ready HTML at the given paper width.
 * This is the BrowserPrintAdapter's content source — same normalized
 * ReceiptData also feeds the PDF adapter, so the two never drift apart.
 */
export function renderReceiptHtml(data: ReceiptData, paperWidth: PaperWidth): string {
  const page = PAGE_CSS[paperWidth];
  const isA4 = paperWidth === "A4";
  const money = (n: number) => `₹${(n || 0).toFixed(2)}`;

  const itemRows = data.items
    .map((item) =>
      isA4
        ? `<tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px;font-size:13px;">${vegIcon(item.isVeg, 11)}${escapeHtml(item.name)}</td>
            <td style="padding:8px;text-align:center;font-size:13px;">${item.quantity}</td>
            ${data.documentType === "BILL" ? `<td style="padding:8px;text-align:right;font-size:13px;">${money(item.total)}</td>` : ""}
          </tr>`
        : `<tr>
            <td style="text-align:left;padding:2px 0;">${vegIcon(item.isVeg, 9)}${escapeHtml(item.name)}</td>
            <td style="text-align:center;padding:2px 0;">x${item.quantity}</td>
            ${data.documentType === "BILL" ? `<td style="text-align:right;padding:2px 0;">${money(item.total)}</td>` : ""}
          </tr>`
    )
    .join("");

  const totalsBlock =
    data.documentType === "BILL"
      ? `
        <div class="divider"></div>
        <table style="width:100%;">
          <tr><td>Subtotal</td><td style="text-align:right;">${money(data.subtotal)}</td></tr>
          ${data.taxPercent > 0 ? `<tr><td>GST (${data.taxPercent}%)</td><td style="text-align:right;">${money(data.taxAmount)}</td></tr>` : `<tr><td style="opacity:.55;">GST</td><td style="text-align:right;opacity:.55;">-- placeholder --</td></tr>`}
          ${data.serviceChargePercent > 0 ? `<tr><td>Service Charge (${data.serviceChargePercent}%)</td><td style="text-align:right;">${money(data.serviceChargeAmount)}</td></tr>` : ""}
        </table>
        <div class="divider"></div>
        <table style="width:100%;"><tr><td class="bold" style="font-size:${isA4 ? "18px" : "1.15em"};">TOTAL</td><td class="bold" style="text-align:right;font-size:${isA4 ? "18px" : "1.15em"};">${money(data.grandTotal)}</td></tr></table>`
      : "";

  const notesBlock = data.notes
    ? `<div class="divider"></div><p class="bold">SPECIAL INSTRUCTIONS:</p><p>&gt;&gt;&gt; ${escapeHtml(String(data.notes).toUpperCase())} &lt;&lt;&lt;</p>`
    : "";

  const qrBlock = data.qrUrl
    ? `<div class="center" style="margin-top:8px;"><img src="${data.qrUrl}" alt="QR" style="width:${isA4 ? "90px" : "56px"};height:${isA4 ? "90px" : "56px"};" /></div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(data.title)} - ${escapeHtml(String(data.orderNumber || ""))}</title>
<style>
  @page { size: ${page.size}; margin: ${isA4 ? "15mm" : "2mm"}; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${isA4 ? "system-ui, -apple-system, sans-serif" : "'Courier New', monospace"}; width: ${page.width}; padding: ${isA4 ? "0" : "2mm"}; font-size: ${page.fontBase}; color: #111; }
  .divider { border-top: 1px dashed #000; margin: 4px 0; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; }
  .accent { color: ${data.accentColor}; }
</style>
</head>
<body>
  ${data.logo ? `<div class="center" style="margin-bottom:4px;"><img src="${data.logo}" alt="logo" style="max-height:${isA4 ? "56px" : "34px"};max-width:70%;" /></div>` : ""}
  <p class="center bold" style="font-size:${isA4 ? "22px" : "1.3em"};">${escapeHtml(data.restaurantName)}</p>
  <p class="center" style="font-size:${isA4 ? "12px" : "0.85em"};text-transform:uppercase;letter-spacing:1px;">${escapeHtml(data.title)}${data.copyLabel ? ` — ${escapeHtml(data.copyLabel)}` : ""}</p>
  <div class="divider"></div>

  <table>
    <tr><td>Table: <strong>${escapeHtml(data.tableCode || "-")}</strong></td><td style="text-align:right;">${new Date(data.timestamp).toLocaleDateString("en-IN")}</td></tr>
    <tr><td>Order #${escapeHtml(String(data.orderNumber || "-"))}</td><td style="text-align:right;">${new Date(data.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td></tr>
  </table>
  <div class="divider"></div>

  <table>
    <thead><tr class="bold"><th>Item</th><th style="text-align:center;">Qty</th>${data.documentType === "BILL" ? '<th style="text-align:right;">Amt</th>' : ""}</tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  ${totalsBlock}
  ${notesBlock}
  ${qrBlock}

  <div class="divider"></div>
  <p class="center" style="font-size:${isA4 ? "12px" : "0.85em"};">${escapeHtml(data.footerMessage || "Thank you! Visit again!")}</p>
</body>
</html>`;
}
