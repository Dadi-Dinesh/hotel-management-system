import type { ReceiptData, PaperWidth } from "../types";

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || "#E8891C").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const bigint = parseInt(full, 16) || 0xe8891c;
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

const WIDTH_MM: Record<PaperWidth, number> = { "58mm": 58, "80mm": 80, A4: 210 };

/**
 * Renders the same normalized ReceiptData as a jsPDF document — used by the
 * PDF adapter (download/share/print-PDF) and by Test Print's "Paper Width
 * Test" button. Kept deliberately close to receiptHtml.ts's layout so the
 * two never visually diverge.
 */
export async function buildReceiptPdf(data: ReceiptData, paperWidth: PaperWidth) {
  const { default: jsPDF } = await import("jspdf");
  const isA4 = paperWidth === "A4";
  const width = WIDTH_MM[paperWidth];

  // Estimate a generous height for roll-paper formats; A4 is fixed portrait.
  const estimatedHeight = isA4 ? 297 : 40 + data.items.length * 6 + (data.documentType === "BILL" ? 30 : 10);

  const doc = new jsPDF({
    unit: "mm",
    format: isA4 ? "a4" : [width, Math.max(estimatedHeight, 60)],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const [ar, ag, ab] = hexToRgb(data.accentColor);
  const margin = isA4 ? 15 : 3;
  let y = isA4 ? 20 : 8;
  const lineH = isA4 ? 7 : 4.2;
  const fs = isA4 ? { title: 18, sub: 11, body: 10, small: 8 } : { title: 11, sub: 7, body: 6.5, small: 5.5 };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs.title);
  doc.setTextColor(30, 20, 10);
  doc.text(data.restaurantName, centerX, y, { align: "center" });
  y += lineH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fs.sub);
  doc.setTextColor(ar, ag, ab);
  doc.text(`${data.title}${data.copyLabel ? " — " + data.copyLabel : ""}`, centerX, y, { align: "center" });
  y += lineH * 0.8;

  doc.setDrawColor(120, 120, 120);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, pageWidth - margin, y);
  y += lineH * 0.8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fs.body);
  doc.setTextColor(20, 20, 20);
  doc.text(`Table: ${data.tableCode || "-"}`, margin, y);
  doc.text(new Date(data.timestamp).toLocaleDateString("en-IN"), pageWidth - margin, y, { align: "right" });
  y += lineH;
  doc.text(`Order #${data.orderNumber || "-"}`, margin, y);
  doc.text(new Date(data.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), pageWidth - margin, y, { align: "right" });
  y += lineH;

  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, pageWidth - margin, y);
  y += lineH;

  doc.setFont("helvetica", "bold");
  const nameColW = isA4 ? pageWidth - margin * 2 - 40 : pageWidth - margin * 2 - 16;
  doc.text("Item", margin, y);
  doc.text("Qty", margin + nameColW + 2, y, { align: "center" });
  if (data.documentType === "BILL") doc.text("Amt", pageWidth - margin, y, { align: "right" });
  y += lineH * 0.9;
  doc.setFont("helvetica", "normal");

  data.items.forEach((item) => {
    if (item.isVeg !== null && item.isVeg !== undefined) {
      const [vr, vg, vb] = item.isVeg ? [10, 130, 10] : [180, 30, 30];
      doc.setDrawColor(vr, vg, vb);
      doc.rect(margin, y - (isA4 ? 3 : 2), isA4 ? 3 : 2, isA4 ? 3 : 2);
    }
    doc.setFontSize(fs.body);
    const nameLines = doc.splitTextToSize(item.name, nameColW - (isA4 ? 5 : 3));
    doc.text(nameLines, margin + (isA4 ? 5 : 3), y);
    doc.text(`x${item.quantity}`, margin + nameColW + 2, y, { align: "center" });
    if (data.documentType === "BILL") doc.text(`Rs.${item.total.toFixed(0)}`, pageWidth - margin, y, { align: "right" });
    y += lineH * Math.max(1, nameLines.length);
  });

  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, pageWidth - margin, y);
  y += lineH;

  if (data.documentType === "BILL") {
    doc.setFontSize(fs.body);
    doc.text("Subtotal", margin, y);
    doc.text(`Rs.${data.subtotal.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    y += lineH;

    if (data.taxPercent > 0) {
      doc.text(`GST (${data.taxPercent}%)`, margin, y);
      doc.text(`Rs.${data.taxAmount.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
      y += lineH;
    } else {
      doc.setTextColor(150, 150, 150);
      doc.text("GST -- placeholder --", margin, y);
      doc.setTextColor(20, 20, 20);
      y += lineH;
    }

    if (data.serviceChargePercent > 0) {
      doc.text(`Service Charge (${data.serviceChargePercent}%)`, margin, y);
      doc.text(`Rs.${data.serviceChargeAmount.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
      y += lineH;
    }

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += lineH;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(fs.title);
    doc.text("TOTAL", margin, y);
    doc.text(`Rs.${data.grandTotal.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    y += lineH * 1.3;
    doc.setFont("helvetica", "normal");
  }

  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fs.small);
    doc.text("SPECIAL INSTRUCTIONS:", margin, y);
    y += lineH * 0.8;
    const noteLines = doc.splitTextToSize(String(data.notes).toUpperCase(), pageWidth - margin * 2);
    doc.text(noteLines, margin, y);
    y += lineH * noteLines.length;
    doc.setFont("helvetica", "normal");
  }

  doc.setFontSize(fs.small);
  doc.setTextColor(120, 120, 120);
  doc.text(data.footerMessage || "Thank you! Visit again!", centerX, y + lineH, { align: "center" });

  return doc;
}
