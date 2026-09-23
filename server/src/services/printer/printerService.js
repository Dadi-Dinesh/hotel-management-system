const cloudPrinterGateway = require("./cloudPrinterGateway");
const printerLogger = require("./printerLogger");

/**
 * PrinterService - Main Cloud Gateway Adapter
 * Replaces direct serialport logic with cloud Socket.IO dispatches to the restaurant Mac mini Printer Agent.
 */
class PrinterService {
  /**
   * Get comprehensive live status of printer agent, queue metrics, and Kitchen Mode
   */
  getStatus() {
    try {
      return cloudPrinterGateway.getStatus();
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
   * List all available hardware serial ports connected to restaurant Mac mini host
   */
  async listPorts() {
    try {
      return await cloudPrinterGateway.listAgentPorts();
    } catch (err) {
      printerLogger.error("Failed to list ports:", { error: err.message });
      return [];
    }
  }

  /**
   * Reconfigure printer port, baud rate, and Kitchen Mode dynamically
   */
  async updateConfig(port, baudRate, kitchenMode) {
    return await cloudPrinterGateway.updateAgentConfig(port, baudRate, kitchenMode);
  }

  /**
   * Force manual connection retry command to agent
   */
  async reconnect() {
    return await cloudPrinterGateway.reconnectAgent();
  }

  /**
   * Print 80mm ESC/POS Test Receipt via Agent
   */
  async printTest() {
    try {
      return await cloudPrinterGateway.dispatchJob("TEST");
    } catch (err) {
      printerLogger.error("printTest failed:", { error: err.message });
      throw err;
    }
  }

  /**
   * Print Customer Billing Receipt via Agent (defaults to 80mm — unchanged).
   * `options.paperWidth` ("58mm"|"80mm") and `options.networkPrinter`
   * ({ip, port}) are optional Phase 8 additions; omitting both reproduces
   * the exact pre-Phase-8 behavior (serial agent, 80mm).
   */
  async printBill(order = {}, options = {}) {
    try {
      console.log("🖨️ [PrinterService.printBill] Dispatching customer bill job to agent...");
      return await cloudPrinterGateway.dispatchJob("BILL", order, {
        printerTarget: "RECEIPT",
        paperWidth: options.paperWidth,
        networkPrinter: options.networkPrinter,
      });
    } catch (err) {
      printerLogger.error("printBill failed:", { error: err.message });
      throw err;
    }
  }

  /**
   * Print Kitchen Order Ticket (KOT) via Agent (defaults to 80mm — unchanged).
   */
  async printKOT(order = {}, options = {}) {
    try {
      console.log("🖨️ [PrinterService.printKOT] Dispatching KOT job to agent...");
      return await cloudPrinterGateway.dispatchJob("KOT", order, {
        printerTarget: "KOT",
        paperWidth: options.paperWidth,
        networkPrinter: options.networkPrinter,
      });
    } catch (err) {
      printerLogger.error("printKOT failed:", { error: err.message });
      throw err;
    }
  }

  /**
   * Test a network printer's reachability via the connected agent.
   */
  async testNetworkPrinter(ip, port) {
    return await cloudPrinterGateway.testNetworkPrinter(ip, port);
  }
}

const printerService = new PrinterService();
module.exports = printerService;
