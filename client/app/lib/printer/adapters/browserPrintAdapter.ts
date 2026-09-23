import type { PrintAdapter, PrintJobInput, PrintResult } from "../types";
import { renderReceiptHtml } from "../templates/receiptHtml";

/**
 * BrowserPrintAdapter — the universal fallback. Uses a hidden iframe (not a
 * popup, so it can't be blocked by a popup blocker) loaded with print-ready
 * HTML, then calls the browser's native print(). This works on every
 * device/OS with zero setup and is what keeps ServeSync usable the moment a
 * restaurant has no printer-agent or hardware configured at all — it is
 * always considered "available".
 */
class BrowserPrintAdapter implements PrintAdapter {
  name = "BROWSER" as const;

  isAvailable(): boolean {
    return typeof window !== "undefined";
  }

  async print(job: PrintJobInput): Promise<PrintResult> {
    if (typeof window === "undefined") {
      return { success: false, adapter: this.name, error: "Browser printing is only available client-side." };
    }

    try {
      const html = renderReceiptHtml(job.data, job.paperWidth);
      const copies = Math.max(1, job.copies || 1);

      for (let i = 0; i < copies; i++) {
        // eslint-disable-next-line no-await-in-loop
        await printOnce(html);
      }

      return { success: true, adapter: this.name, requiresUserAction: true };
    } catch (err: any) {
      return { success: false, adapter: this.name, error: err.message || "Browser print failed to open." };
    }
  }
}

function printOnce(html: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
      resolve();
    };

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Some browsers restrict programmatic print from an iframe — the
        // document is still visible/printable manually via Ctrl/Cmd+P.
      }
      cleanup();
    };

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    } else {
      cleanup();
    }
  });
}

export const browserPrintAdapter = new BrowserPrintAdapter();
