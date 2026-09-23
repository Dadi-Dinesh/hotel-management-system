/**
 * Universal Print Engine (Phase 8) — shared types.
 *
 * Architecture: PrintService -> PrinterAdapter -> specific printer.
 * Every adapter (ESCPOSAdapter, NetworkAdapter, BluetoothAdapter,
 * BrowserPrintAdapter, PDFAdapter) implements the same PrintAdapter
 * interface, so PrintService never needs to know which one it's calling.
 */

export type DocumentType = "BILL" | "KOT" | "TEST";

export type AdapterName = "THERMAL_AGENT" | "NETWORK" | "BLUETOOTH" | "BROWSER" | "PDF";

export type PaperWidth = "58mm" | "80mm" | "A4";

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  isVeg?: boolean | null;
  total: number;
}

/** Normalized shape every template (HTML or PDF) renders from — built once
 * by receiptData.ts, shared by every adapter so layout logic lives in one place. */
export interface ReceiptData {
  documentType: DocumentType;
  restaurantName: string;
  logo?: string | null;
  accentColor: string;
  title: string;
  copyLabel?: string;
  tableCode?: string;
  tableNumber?: number;
  orderNumber?: string | number;
  sessionId?: string;
  timestamp: string;
  items: ReceiptItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  grandTotal: number;
  notes?: string | null;
  footerMessage?: string | null;
  welcomeMessage?: string | null;
  qrUrl?: string | null;
}

export interface PrintJobInput {
  documentType: DocumentType;
  paperWidth: PaperWidth;
  data: ReceiptData;
  copies?: number;
  networkPrinter?: { ip: string; port?: number } | null;
}

export interface PrintResult {
  success: boolean;
  adapter: AdapterName;
  error?: string;
  requiresUserAction?: boolean; // e.g. browser print dialog / Bluetooth device picker
}

export interface PrintAdapter {
  name: AdapterName;
  /** Cheap, synchronous-ish capability check — never throws. */
  isAvailable(): boolean | Promise<boolean>;
  print(job: PrintJobInput): Promise<PrintResult>;
}
