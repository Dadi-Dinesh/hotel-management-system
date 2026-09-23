import type { ReceiptData, PaperWidth } from "./types";

/**
 * Minimal browser-side ESC/POS byte encoder — a lightweight TypeScript port
 * of printer-agent/src/formatters/escposBuilder.js for the one adapter that
 * runs entirely client-side with no server round trip: BluetoothAdapter
 * (Web Bluetooth talks directly to the printer from the browser tab, so
 * there's no agent process to build the buffer for it).
 */
const PAPER_WIDTH_CHARS: Record<PaperWidth, number> = { "58mm": 32, "80mm": 48, A4: 48 };

class EscPosEncoder {
  private bytes: number[] = [];
  private maxChars: number;

  constructor(paperWidth: PaperWidth = "80mm") {
    this.maxChars = PAPER_WIDTH_CHARS[paperWidth] || 48;
    this.bytes.push(0x1b, 0x40); // init
  }

  align(mode: "left" | "center" | "right") {
    this.bytes.push(0x1b, 0x61, mode === "center" ? 1 : mode === "right" ? 2 : 0);
    return this;
  }

  bold(on = true) {
    this.bytes.push(0x1b, 0x45, on ? 1 : 0);
    return this;
  }

  size(w = 1, h = 1) {
    let n = 0x00;
    if (w === 2 && h === 2) n = 0x11;
    else if (h === 2) n = 0x01;
    else if (w === 2) n = 0x10;
    this.bytes.push(0x1d, 0x21, n);
    return this;
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) this.bytes.push(0x0d, 0x0a);
    return this;
  }

  text(str: string) {
    const sanitized = String(str || "")
      .replace(/₹/g, "Rs.")
      .replace(/–|—/g, "-");
    for (let i = 0; i < sanitized.length; i++) {
      const code = sanitized.charCodeAt(i);
      this.bytes.push(code > 255 ? 63 : code);
    }
    return this;
  }

  textLine(str = "") {
    this.text(str);
    this.feed(1);
    return this;
  }

  divider(char = "-") {
    this.textLine(char.repeat(this.maxChars));
    return this;
  }

  row2(left: string, right: string) {
    const l = String(left || "");
    const r = String(right || "");
    const spaces = Math.max(1, this.maxChars - l.length - r.length);
    this.textLine(l + " ".repeat(spaces) + r);
    return this;
  }

  cut() {
    this.feed(4);
    this.bytes.push(0x1d, 0x56, 0x41, 0x00);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

/** Builds a simple ESC/POS buffer for Bill/KOT from normalized ReceiptData. */
export function buildEscPosBuffer(data: ReceiptData, paperWidth: PaperWidth): Uint8Array {
  const enc = new EscPosEncoder(paperWidth);

  enc.align("center").bold(true).size(2, 2).textLine(data.restaurantName).size(1, 1).bold(false);
  enc.textLine(`${data.title}${data.copyLabel ? " - " + data.copyLabel : ""}`);
  enc.divider("=");
  enc.align("left");
  enc.row2(`Table: ${data.tableCode || "-"}`, new Date(data.timestamp).toLocaleTimeString());
  enc.row2(`Order #${data.orderNumber || "-"}`, new Date(data.timestamp).toLocaleDateString());
  enc.divider("-");

  data.items.forEach((item) => {
    enc.row2(item.name, `x${item.quantity}`);
  });
  enc.divider("-");

  if (data.documentType === "BILL") {
    enc.bold(true).row2("TOTAL", `Rs.${data.grandTotal.toFixed(2)}`).bold(false);
    enc.divider("=");
  }

  if (data.notes) {
    enc.textLine("SPECIAL INSTRUCTIONS:").textLine(String(data.notes).toUpperCase()).divider("-");
  }

  enc.align("center").textLine(data.footerMessage || "Thank you!");
  enc.cut();

  return enc.build();
}
