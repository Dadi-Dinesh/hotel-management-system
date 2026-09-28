/**
 * QR code + print-ready poster generation for restaurant tables.
 * Fully client-side — no new backend endpoints needed. Reuses jsPDF
 * (already installed in Phase 5 for report exports).
 */
import QRCode from "qrcode";

/** The URL a table's QR code should encode — future-ready, slug-scoped.
 * Includes the secure token when the table has one (Phase 7); omitted
 * entirely for legacy/open-mode tables, so their QR keeps working exactly
 * as before. */
export function buildTableUrl(slug, tableCode, token) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = `${origin}/restaurant/${slug}/table/${tableCode}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export async function generateQRDataUrl(url) {
  return QRCode.toDataURL(url, {
    width: 480,
    margin: 1,
    color: { dark: "#3D2710", light: "#FFFDF7" },
  });
}

/** Draws one poster page onto an existing jsPDF document at its current page. */
export async function drawPosterPage(doc, restaurant, table) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const accent = restaurant.accentColor || "#E8891C";
  const [ar, ag, ab] = hexToRgb(accent);

  // Border frame
  doc.setDrawColor(61, 39, 16);
  doc.setLineWidth(1);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Restaurant name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(61, 39, 16);
  doc.text(restaurant.name || "ServeSync", centerX, 35, { align: "center" });

  if (restaurant.cuisine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(120, 100, 80);
    doc.text(restaurant.cuisine, centerX, 43, { align: "center" });
  }

  // Table number — the headline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(48);
  doc.setTextColor(ar, ag, ab);
  doc.text(`TABLE ${table.number}`, centerX, 75, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(61, 39, 16);
  doc.text(table.code, centerX, 85, { align: "center" });

  // QR code
  const url = buildTableUrl(restaurant.slug, table.code, table.qrToken);
  const qrDataUrl = await generateQRDataUrl(url);
  const qrSize = 80;
  doc.addImage(qrDataUrl, "PNG", centerX - qrSize / 2, 95, qrSize, qrSize);

  // Instructions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(61, 39, 16);
  doc.text("SCAN TO ORDER", centerX, 190, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 100, 80);
  doc.text("1. Open your phone camera and scan the code above", centerX, 200, { align: "center" });
  doc.text("2. Browse the menu and add items to your cart", centerX, 206, { align: "center" });
  doc.text("3. Place your order — it goes straight to our kitchen", centerX, 212, { align: "center" });

  // Footer branding
  doc.setFontSize(9);
  doc.setTextColor(160, 140, 120);
  doc.text("Powered by ServeSync", centerX, pageHeight - 18, { align: "center" });
}

function hexToRgb(hex) {
  const clean = (hex || "#E8891C").replace("#", "");
  const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

/**
 * One printable A4 poster per table, all in a single PDF — bulk download/print.
 * `returnBlob: true` skips the auto-download and returns the PDF blob instead —
 * used by qrKitGenerator.js to bundle this unmodified into the Welcome Kit ZIP.
 */
export async function generateTablePostersPDF({ restaurant, tables, returnBlob = false }) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  for (let i = 0; i < tables.length; i++) {
    if (i > 0) doc.addPage();
    // eslint-disable-next-line no-await-in-loop
    await drawPosterPage(doc, restaurant, tables[i]);
  }

  if (returnBlob) return doc.output("blob");
  doc.save(`${(restaurant.slug || "restaurant")}-table-qr-posters.pdf`);
  return doc;
}

/** A single table's poster as a standalone PDF — used for "Download Poster" per row. */
export async function generateSingleTablePosterPDF({ restaurant, table, returnBlob = false }) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await drawPosterPage(doc, restaurant, table);

  if (returnBlob) return doc.output("blob");
  doc.save(`${(restaurant.slug || "restaurant")}-table-${table.code}-qr.pdf`);
  return doc;
}

/** All tables as separate PDFs, bundled into one ZIP — "Download All (ZIP)". */
export async function generateTablePostersZip({ restaurant, tables }) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  for (const table of tables) {
    // eslint-disable-next-line no-await-in-loop
    const blob = await generateSingleTablePosterPDF({ restaurant, table, returnBlob: true });
    zip.file(`table-${table.code}-qr.pdf`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(restaurant.slug || "restaurant")}-qr-posters.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Opens a single table's poster in a new tab, pre-triggered for printing. */
export async function printSingleTablePoster({ restaurant, table }) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await drawPosterPage(doc, restaurant, table);
  const blobUrl = doc.output("bloburl");
  const win = window.open(blobUrl, "_blank");
  if (win) {
    win.addEventListener("load", () => {
      try {
        win.print();
      } catch (e) {
        // Some browsers block programmatic print from a blob tab — the user
        // can still print manually from the opened PDF.
      }
    });
  }
}
