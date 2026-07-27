const SerialPrinter = require("./SerialPrinter");
const PrintQueue = require("./PrintQueue");
const EscPosBuilder = require("./escposBuilder");
const { buildCustomerBillReceipt } = require("./receiptPrinter");
const { buildKOTReceipt } = require("./kotPrinter");
const kotRoutingService = require("./kotRoutingService");
const printerConfigManager = require("./printerConfigManager");
const printerLogger = require("./printerLogger");

/**
 * PrinterService - Main Facade combining Serial Connection, Queue, ESC/POS Formatting, and Kitchen Mode Routing
 */
class PrinterService {
  constructor() {
    this.serialPrinter = new SerialPrinter();
    this.printQueue = new PrintQueue(this.serialPrinter);
  }

  /**
   * Get comprehensive live status of serial printer hardware, stats, queue metrics, and Kitchen Mode
   */
  getStatus() {
    try {
      const statusInfo = this.serialPrinter.getStatusInfo();
      const queueMetrics = this.printQueue.getMetrics();

      return {
        success: true,
        ...statusInfo,
        queue: queueMetrics,
        queueLength: queueMetrics.waitingJobs,
      };
    } catch (err) {
      printerLogger.error("Failed to fetch printer status:", { error: err.message });
      return {
        success: false,
        connected: false,
        status: "ERROR",
        lastError: err.message,
      };
    }
  }

  /**
   * List all available hardware USB/Serial printer ports connected to host machine
   */
  async listPorts() {
    try {
      const ports = await SerialPrinter.listPorts();
      printerLogger.info(`🔍 [PrinterService] Discovered ${ports.length} hardware serial ports.`);
      return ports;
    } catch (err) {
      printerLogger.error("Failed to list ports:", { error: err.message });
      return [];
    }
  }

  /**
   * Reconfigure printer port, baud rate, and Kitchen Mode dynamically without server restart
   */
  async updateConfig(port, baudRate, kitchenMode) {
    const config = printerConfigManager.saveConfig(port, baudRate, kitchenMode);
    await this.serialPrinter.reconfigure(config.port, config.baudRate);
    return this.getStatus();
  }

  /**
   * Force manual connection retry
   */
  async reconnect() {
    this.serialPrinter.connect();
    return this.getStatus();
  }

  /**
   * Print 80mm ESC/POS Test Receipt
   */
  async printTest() {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB");
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const builder = new EscPosBuilder();
      builder
        .divider("=")
        .align("center")
        .bold(true)
        .size(2, 2)
        .textLine("SREE NOOKAMBIKA")
        .size(1, 1)
        .textLine("FAMILY DHABA")
        .feed(1)
        .textLine("PRINTER TEST SUCCESS")
        .size(1, 1)
        .bold(false)
        .textLine(`Port: ${this.serialPrinter.portPath}`)
        .textLine(`Baud: ${this.serialPrinter.baudRate}`)
        .textLine(`Kitchen Mode: ${printerConfigManager.getConfig().kitchenMode}`)
        .textLine(`Date: ${dateStr}`)
        .textLine(`Time: ${timeStr}`)
        .divider("=")
        .feed(4)
        .cut();

      const buffer = builder.build();
      return await this.printQueue.enqueue(buffer, "TEST");
    } catch (err) {
      printerLogger.error("printTest failed:", { error: err.message });
      throw err;
    }
  }

  /**
   * Print 80mm Customer Billing Receipt
   */
  async printBill(order = {}) {
    try {
      console.log("🖨️ [PrinterService.printBill] Building ESC/POS customer bill buffer...");
      const buffer = buildCustomerBillReceipt(order);
      return await this.printQueue.enqueue(buffer, "BILL");
    } catch (err) {
      printerLogger.error("printBill failed:", { error: err.message });
      throw err;
    }
  }

  /**
   * Print 80mm Kitchen Order Ticket (KOT)
   * Uses KOTRoutingService to evaluate "LIVE" vs "NORMAL" mode and category rules
   */
  async printKOT(order = {}) {
    try {
      const config = printerConfigManager.getConfig();
      const kitchenMode = config.kitchenMode || "LIVE";

      console.log(`🖨️ [PrinterService.printKOT] Routing KOT order (Kitchen Mode: ${kitchenMode})...`);
      const routedJobs = kotRoutingService.routeOrder(order, kitchenMode);

      const results = [];
      for (const job of routedJobs) {
        const buffer = buildKOTReceipt(job.order, job.copyLabel);
        const res = await this.printQueue.enqueue(buffer, `KOT (${job.copyLabel})`);
        results.push(res);
      }

      return results.length === 1 ? results[0] : { success: true, count: results.length, jobs: results };
    } catch (err) {
      printerLogger.error("printKOT failed:", { error: err.message });
      throw err;
    }
  }
}

const printerService = new PrinterService();
module.exports = printerService;
