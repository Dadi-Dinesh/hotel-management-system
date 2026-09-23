import type { PrintAdapter, PrintJobInput, PrintResult } from "../types";
import { buildReceiptPdf } from "../templates/receiptPdf";

export type PdfAction = "download" | "print" | "share";

/**
 * PDFAdapter — renders the same normalized receipt data as a PDF via
 * jsPDF (already a dependency). Always available; used both as an explicit
 * "Download PDF" action and as a print-fallback option for regular
 * inkjet/laser printers via the browser's PDF print dialog.
 */
class PDFAdapter implements PrintAdapter {
  name = "PDF" as const;
  private action: PdfAction = "download";

  configure(action: PdfAction) {
    this.action = action;
  }

  isAvailable(): boolean {
    return typeof window !== "undefined";
  }

  async print(job: PrintJobInput): Promise<PrintResult> {
    try {
      const doc = await buildReceiptPdf(job.data, job.paperWidth);
      const filename = `${job.documentType.toLowerCase()}-${job.data.orderNumber || Date.now()}.pdf`;

      if (this.action === "download") {
        doc.save(filename);
        return { success: true, adapter: this.name };
      }

      if (this.action === "print") {
        const blobUrl = doc.output("bloburl");
        const win = window.open(blobUrl as unknown as string, "_blank");
        if (win) {
          win.addEventListener("load", () => {
            try {
              win.print();
            } catch {
              // User can still print manually from the opened PDF tab.
            }
          });
        }
        return { success: true, adapter: this.name, requiresUserAction: true };
      }

      // share
      const blob = doc.output("blob");
      const file = new File([blob], filename, { type: "application/pdf" });
      if (typeof navigator !== "undefined" && (navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: filename });
        return { success: true, adapter: this.name, requiresUserAction: true };
      }
      // No native share support — fall back to download so the action isn't lost.
      doc.save(filename);
      return { success: true, adapter: this.name };
    } catch (err: any) {
      return { success: false, adapter: this.name, error: err.message || "Failed to generate PDF." };
    }
  }
}

export const pdfAdapter = new PDFAdapter();
