import api from "../api";
import type { AdapterName, DocumentType, PaperWidth, PrintAdapter, PrintResult, ReceiptData } from "./types";
import { escposAdapter } from "./adapters/escposAdapter";
import { networkAdapter } from "./adapters/networkAdapter";
import { browserPrintAdapter } from "./adapters/browserPrintAdapter";
import { pdfAdapter } from "./adapters/pdfAdapter";
import { bluetoothAdapter } from "./adapters/bluetoothAdapter";

export interface PrinterSettings {
  billPrinterType: AdapterName;
  kitchenPrinterType: AdapterName;
  billPaperWidth: PaperWidth;
  kotPaperWidth: PaperWidth;
  copies: number;
  autoPrintKOT: boolean;
  autoPrintBill: boolean;
  networkPrinterIp?: string | null;
  networkPrinterPort?: number;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  billPrinterType: "BROWSER",
  kitchenPrinterType: "BROWSER",
  billPaperWidth: "80mm",
  kotPaperWidth: "80mm",
  copies: 1,
  autoPrintKOT: false,
  autoPrintBill: false,
  networkPrinterIp: null,
  networkPrinterPort: 9100,
};

const ADAPTERS: Record<AdapterName, PrintAdapter> = {
  THERMAL_AGENT: escposAdapter,
  NETWORK: networkAdapter,
  BLUETOOTH: bluetoothAdapter,
  BROWSER: browserPrintAdapter,
  PDF: pdfAdapter,
};

export interface PrintOptions {
  documentType: DocumentType;
  data: ReceiptData;
  settings?: PrinterSettings;
  /** Force a single specific adapter (e.g. Test Print page trying one at a time) — skips the fallback chain. */
  forceAdapter?: AdapterName;
  copies?: number;
  /**
   * When true, never falls through to BROWSER/PDF — a background/automatic
   * trigger (e.g. "print KOT the moment an order is accepted") should fail
   * quietly rather than popping a print dialog on every single order. Only
   * an explicit, user-clicked print action should set this false (default).
   */
  silent?: boolean;
}

export interface PrintOutcome {
  success: boolean;
  adapterUsed: AdapterName | null;
  attempts: PrintResult[];
  fellBack: boolean;
}

/**
 * PrintService — the single entry point every screen should call to print.
 * Tries the restaurant's configured adapter first, then always has BROWSER
 * as the guaranteed-last resort, so a print action can never fully fail and
 * block a workflow (session close, order accept, etc.) — it can only ever
 * either succeed silently or hand off to the browser's print dialog.
 */
class PrintServiceImpl {
  async print(options: PrintOptions): Promise<PrintOutcome> {
    const settings = options.settings || DEFAULT_PRINTER_SETTINGS;
    const paperWidth = options.documentType === "BILL" ? settings.billPaperWidth : settings.kotPaperWidth;
    const preferredAdapter = options.documentType === "BILL" ? settings.billPrinterType : settings.kitchenPrinterType;

    if (settings.networkPrinterIp) {
      networkAdapter.configure(settings.networkPrinterIp, settings.networkPrinterPort || 9100);
    }
    pdfAdapter.configure("print");

    const fullChain = dedupe([preferredAdapter, "THERMAL_AGENT", "BROWSER"]);
    const chain: AdapterName[] = options.forceAdapter
      ? [options.forceAdapter]
      : options.silent
      ? fullChain.filter((a) => a !== "BROWSER" && a !== "PDF")
      : fullChain;

    const attempts: PrintResult[] = [];
    let adapterUsed: AdapterName | null = null;

    // Create the job as PENDING up front so Print Queue reflects reality
    // while a slow adapter (thermal/network can take up to 30s) is running,
    // not just after the fact.
    const jobId = await createPendingJob(options, chain[0]);

    for (let i = 0; i < chain.length; i++) {
      const adapterName = chain[i];
      const adapter = ADAPTERS[adapterName];
      if (!adapter) continue;

      try {
        // eslint-disable-next-line no-await-in-loop
        const available = await adapter.isAvailable();
        if (!available && adapterName !== "BROWSER") {
          attempts.push({ success: false, adapter: adapterName, error: "Not available." });
          continue;
        }

        if (jobId && (adapterName === "THERMAL_AGENT" || adapterName === "NETWORK")) {
          // eslint-disable-next-line no-await-in-loop
          await updateJob(jobId, { status: "PRINTING", adapter: adapterName }).catch(() => {});
        }

        // eslint-disable-next-line no-await-in-loop
        const result = await adapter.print({
          documentType: options.documentType,
          paperWidth,
          data: options.data,
          copies: options.copies || settings.copies,
          networkPrinter: settings.networkPrinterIp ? { ip: settings.networkPrinterIp, port: settings.networkPrinterPort || 9100 } : null,
        });

        attempts.push(result);
        if (result.success) {
          adapterUsed = adapterName;
          break;
        }
      } catch (err: any) {
        attempts.push({ success: false, adapter: adapterName, error: err?.message || "Adapter threw an unexpected error." });
      }
    }

    const outcome: PrintOutcome = {
      success: !!adapterUsed,
      adapterUsed,
      attempts,
      fellBack: !!adapterUsed && adapterUsed !== preferredAdapter,
    };

    if (jobId) {
      updateJob(jobId, {
        status: outcome.success ? "COMPLETED" : "FAILED",
        adapter: outcome.adapterUsed || chain[0],
        errorMessage: outcome.success ? undefined : outcome.attempts.map((a) => `${a.adapter}: ${a.error}`).join(" | "),
      }).catch(() => {});
    } else {
      logJob(options, outcome).catch(() => {});
    }

    return outcome;
  }
}

function dedupe(list: AdapterName[]): AdapterName[] {
  return Array.from(new Set(list));
}

/** Creates the PENDING job row and returns its id, or null if the write failed
 * (e.g. no restaurant context) — callers fall back to a single after-the-fact log. */
async function createPendingJob(options: PrintOptions, firstAdapter: AdapterName): Promise<string | null> {
  try {
    const res = await api.post("/print-jobs", {
      documentType: options.documentType,
      adapter: firstAdapter,
      status: "PENDING",
      tableCode: options.data.tableCode,
      orderNumber: options.data.orderNumber,
      sessionId: options.data.sessionId,
      payloadSnapshot: options.data,
    });
    return res.data?.data?.id || null;
  } catch {
    return null;
  }
}

async function updateJob(jobId: string, patch: { status?: string; adapter?: AdapterName; errorMessage?: string }) {
  await api.patch(`/print-jobs/${jobId}`, patch);
}

/** Fallback for when creating the PENDING job failed — logs once, after the fact. */
async function logJob(options: PrintOptions, outcome: PrintOutcome) {
  try {
    await api.post("/print-jobs", {
      documentType: options.documentType,
      adapter: outcome.adapterUsed || options.settings?.billPrinterType || "BROWSER",
      status: outcome.success ? "COMPLETED" : "FAILED",
      tableCode: options.data.tableCode,
      orderNumber: options.data.orderNumber,
      sessionId: options.data.sessionId,
      errorMessage: outcome.success ? undefined : outcome.attempts.map((a) => `${a.adapter}: ${a.error}`).join(" | "),
      payloadSnapshot: options.data,
    });
  } catch {
    // History is best-effort — never let it affect the actual print outcome.
  }
}

export const PrintService = new PrintServiceImpl();
