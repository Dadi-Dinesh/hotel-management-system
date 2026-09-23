/**
 * CSV / PDF / print export helpers for the admin Reports center.
 * All client-side — no new backend export endpoints needed, since every
 * analytics page already has the data in hand once it's fetched.
 */

function escapeCsvValue(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** columns: [{ key, label }]  rows: array of plain objects */
export function exportToCSV(filename, columns, rows) {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(typeof c.value === "function" ? c.value(row) : row[c.key])).join(",")
  );
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Lazy-loads jsPDF + autotable only when a PDF export is actually requested. */
export async function exportToPDF(filename, title, columns, rows, subtitle) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setTextColor(61, 39, 16);
  doc.text(title, 14, 18);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120, 100, 80);
    doc.text(subtitle, 14, 25);
  }

  doc.autoTable({
    startY: subtitle ? 30 : 26,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => String((typeof c.value === "function" ? c.value(row) : row[c.key]) ?? ""))),
    headStyles: { fillColor: [61, 39, 16] },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [255, 253, 247] },
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/** Opens a clean, print-only view of the given rows via the browser's print dialog. */
export function printReport(title, columns, rows, subtitle) {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;

  const headerHtml = columns.map((c) => `<th>${c.label}</th>`).join("");
  const rowsHtml = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => `<td>${(typeof c.value === "function" ? c.value(row) : row[c.key]) ?? ""}</td>`)
          .join("")}</tr>`
    )
    .join("");

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #3D2710; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          p.subtitle { font-size: 11px; color: #7a5c3a; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #E6D4B8; padding: 6px 8px; text-align: left; }
          th { background: #3D2710; color: #FFFDF7; text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; }
          tr:nth-child(even) { background: #FFFDF7; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
        <table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  win.document.close();
}
