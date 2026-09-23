import api from "../../api";
import type { PrintAdapter, PrintJobInput, PrintResult } from "../types";

/**
 * ESCPOSAdapter — the existing serial/USB thermal-printer path (TVS MP-280
 * Lite, Epson TM series, Rongta, XPrinter, POS-58/80, Sunmi — any ESC/POS
 * printer wired through the local printer-agent over USB/serial).
 *
 * This is a thin wrapper around the exact REST endpoints that already
 * existed before Phase 8 (/api/printer/bill, /api/printer/kot) — zero
 * behavior change for restaurants already using this path.
 */
class ESCPOSAdapter implements PrintAdapter {
  name = "THERMAL_AGENT" as const;

  async isAvailable(): Promise<boolean> {
    try {
      const res = await api.get("/printer/status");
      return !!res.data?.connected;
    } catch {
      return false;
    }
  }

  async print(job: PrintJobInput): Promise<PrintResult> {
    try {
      const endpoint = job.documentType === "BILL" ? "/printer/bill" : job.documentType === "KOT" ? "/printer/kot" : "/printer/test";
      const order = receiptDataToLegacyOrder(job);
      const res = await api.post(endpoint, { order, paperWidth: job.paperWidth });
      if (res.data?.success) {
        return { success: true, adapter: this.name };
      }
      return { success: false, adapter: this.name, error: res.data?.message || "Thermal printer rejected the job." };
    } catch (err: any) {
      return { success: false, adapter: this.name, error: err.response?.data?.message || err.message || "Thermal printer unreachable." };
    }
  }
}

/** Shapes the normalized ReceiptData back into the legacy `order` payload
 * the existing agent-side ESC/POS builders (buildCustomerBillReceipt /
 * buildKOTReceipt) already expect — keeps that side of the pipe untouched. */
function receiptDataToLegacyOrder(job: PrintJobInput) {
  const { data } = job;
  return {
    id: data.sessionId,
    orderNumber: data.orderNumber,
    tableCode: data.tableCode,
    tableNumber: data.tableNumber,
    createdAt: data.timestamp,
    items: data.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
    notes: data.notes,
  };
}

export const escposAdapter = new ESCPOSAdapter();
export { receiptDataToLegacyOrder };
