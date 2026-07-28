/**
 * ESC/POS Command Byte Generator for 80mm Thermal Receipt Printers (HS-802UWB)
 * Standard 80mm Thermal Paper: 48 character columns width (Font A)
 */

class EscPosBuilder {
  constructor() {
    this.buffer = [];
    this.maxChars = 48; // Standard 80mm font width
    this.init();
  }

  /**
   * Reset / Initialize Printer (ESC @)
   */
  init() {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  /**
   * Set Alignment (ESC a n: 0=Left, 1=Center, 2=Right)
   */
  align(mode) {
    const val = mode === "center" ? 1 : mode === "right" ? 2 : 0;
    this.buffer.push(0x1b, 0x61, val);
    return this;
  }

  /**
   * Set Bold Mode (ESC E n: 1=ON, 0=OFF)
   */
  bold(enable = true) {
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
    return this;
  }

  /**
   * Set Text Size / Font Scale (GS ! n)
   */
  size(widthMult = 1, heightMult = 1) {
    let n = 0x00;
    if (widthMult === 2 && heightMult === 2) {
      n = 0x11; // Double Width & Double Height
    } else if (heightMult === 2) {
      n = 0x01; // Double Height
    } else if (widthMult === 2) {
      n = 0x10; // Double Width
    }
    this.buffer.push(0x1d, 0x21, n);
    return this;
  }

  /**
   * Feed lines (CR LF: 0x0d, 0x0a)
   */
  feed(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0d, 0x0a);
    }
    return this;
  }

  /**
   * Print Text String
   */
  text(str) {
    const bytes = this.stringToBytes(str);
    this.buffer.push(...bytes);
    return this;
  }

  /**
   * Print Text Line with Line Break
   */
  textLine(str = "") {
    this.text(str);
    this.feed(1);
    return this;
  }

  /**
   * Print Horizontal Divider Line (48 characters width)
   */
  divider(char = "-") {
    const line = char.repeat(this.maxChars);
    this.textLine(line);
    return this;
  }

  /**
   * Print 2-Column Row (Left-aligned & Right-aligned, exactly 48 chars total)
   */
  row2(left, right) {
    const lStr = String(left || "");
    const rStr = String(right || "");
    const available = this.maxChars - rStr.length;
    let paddedLeft = lStr;
    if (paddedLeft.length > available) {
      paddedLeft = paddedLeft.substring(0, Math.max(1, available - 1));
    }
    const spacesCount = Math.max(1, this.maxChars - paddedLeft.length - rStr.length);
    const line = paddedLeft + " ".repeat(spacesCount) + rStr;
    this.textLine(line);
    return this;
  }

  /**
   * Print 3-Column Item Row (Name: 24 chars left, Qty: 10 chars center, Price: 14 chars right)
   * Exactly 48 columns width without text overflow
   */
  item3Row(name, qty, price) {
    const colNameW = 24;
    const colQtyW = 10;
    const colPriceW = 14;

    const wrappedName = this.wrapText(name || "Item", colNameW);
    const firstName = (wrappedName[0] || "").padEnd(colNameW, " ");

    const qtyStr = String(qty || 1);
    const qtyLeftPad = Math.floor((colQtyW - qtyStr.length) / 2);
    const qtyRightPad = colQtyW - qtyStr.length - qtyLeftPad;
    const qtyCell = " ".repeat(Math.max(0, qtyLeftPad)) + qtyStr + " ".repeat(Math.max(0, qtyRightPad));

    const priceCell = String(price || "Rs.0").padStart(colPriceW, " ");

    this.textLine(`${firstName}${qtyCell}${priceCell}`);

    // Print wrapped item name lines if name exceeds 24 characters
    for (let i = 1; i < wrappedName.length; i++) {
      this.textLine(wrappedName[i].padEnd(colNameW, " ") + " ".repeat(colQtyW + colPriceW));
    }

    return this;
  }

  /**
   * Paper Cut Command (GS V 65 0: Full cut with paper feed)
   */
  cut() {
    this.feed(4);
    this.buffer.push(0x1d, 0x56, 0x41, 0x00);
    return this;
  }

  /**
   * Open Cash Drawer Signal (ESC p 0 25 250)
   */
  openDrawer() {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  /**
   * Build Buffer for SerialPort transmission
   */
  build() {
    return Buffer.from(this.buffer);
  }

  /**
   * Convert string to ASCII byte array
   * Replaces Unicode ₹ symbol with "Rs." and non-ASCII chars cleanly to avoid '?'
   */
  stringToBytes(str) {
    const bytes = [];
    const sanitized = String(str || "")
      .replace(/₹/g, "Rs.")
      .replace(/–|—/g, "-")
      .replace(/’|‘/g, "'")
      .replace(/“|”/g, '"');

    for (let i = 0; i < sanitized.length; i++) {
      const code = sanitized.charCodeAt(i);
      bytes.push(code > 255 ? 63 : code); // ASCII fallback
    }
    return bytes;
  }

  /**
   * Wrap text into array of lines with length at most maxLen
   */
  wrapText(text, maxLen) {
    const str = String(text || "").trim();
    if (!str) return [""];

    const words = str.split(" ");
    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      if ((currentLine + (currentLine ? " " : "") + word).length <= maxLen) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) lines.push(currentLine);
        if (word.length > maxLen) {
          // Hard split extremely long single words
          let remaining = word;
          while (remaining.length > maxLen) {
            lines.push(remaining.substring(0, maxLen));
            remaining = remaining.substring(maxLen);
          }
          currentLine = remaining;
        } else {
          currentLine = word;
        }
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [str.substring(0, maxLen)];
  }
}

module.exports = EscPosBuilder;
