const printerService = require("../services/printer/printerService");
const printerLogger = require("../services/printer/printerLogger");

/**
 * Helper to log full error trace and send HTTP 500 without crashing Express server
 */
function handlePrinterApiError(res, err, actionName = "Printer Action") {
  console.error(`💥 [PrinterController] ${actionName} Error:`, err.message);
  console.error(err.stack || err);

  printerLogger.error(`API Error in ${actionName}:`, {
    message: err.message,
    stack: err.stack,
  });

  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: err.message || `${actionName} failed. Printer hardware offline or port busy.`,
    });
  }
}

/**
 * Get Serial Thermal Printer Status
 * GET /api/printer/status
 */
const getPrinterStatus = async (req, res, next) => {
  try {
    const status = printerService.getStatus();
    res.json(status);
  } catch (error) {
    handlePrinterApiError(res, error, "GET /status");
  }
};

/**
 * List Available System Serial Ports
 * GET /api/printer/ports
 */
const getPrinterPorts = async (req, res, next) => {
  try {
    const ports = await printerService.listPorts();
    res.json({
      success: true,
      ports,
    });
  } catch (error) {
    handlePrinterApiError(res, error, "GET /ports");
  }
};

/**
 * Update Printer Configuration (Port, Baud Rate & Kitchen Mode) dynamically without server restart
 * POST /api/printer/config
 */
const updatePrinterConfig = async (req, res, next) => {
  try {
    const { port, baudRate, kitchenMode } = req.body;
    if (!port) {
      return res.status(400).json({
        success: false,
        message: "Port path is required.",
      });
    }

    const updatedStatus = await printerService.updateConfig(port, baudRate, kitchenMode);
    res.json({
      success: true,
      message: `Printer settings updated (Port: ${port}, Baud: ${baudRate || 9600}, Kitchen Mode: ${kitchenMode || "LIVE"}).`,
      status: updatedStatus,
    });
  } catch (error) {
    handlePrinterApiError(res, error, "POST /config");
  }
};

/**
 * Force Reconnect Printer
 * POST /api/printer/reconnect
 */
const reconnectPrinter = async (req, res, next) => {
  try {
    const updatedStatus = await printerService.reconnect();
    res.json({
      success: true,
      message: "Printer reconnection initiated.",
      status: updatedStatus,
    });
  } catch (error) {
    handlePrinterApiError(res, error, "POST /reconnect");
  }
};

/**
 * Print ESC/POS Test Receipt
 * POST /api/printer/test
 */
const printTestReceipt = async (req, res, next) => {
  try {
    const result = await printerService.printTest();
    res.json({
      success: true,
      message: "Test receipt printed successfully! 🖨️",
      data: result,
    });
  } catch (error) {
    handlePrinterApiError(res, error, "POST /test");
  }
};

/**
 * Print 80mm Customer Bill Receipt
 * POST /api/printer/bill
 */
const printCustomerBillReceipt = async (req, res, next) => {
  try {
    console.log("📥 [POST /api/printer/bill] Received request body:", JSON.stringify(req.body, null, 2));

    const orderData = req.body.order || req.body;
    if (!orderData || !orderData.items || !Array.isArray(orderData.items)) {
      return res.status(400).json({
        success: false,
        message: "Order data object with an items array is required.",
      });
    }

    const result = await printerService.printBill(orderData, {
      paperWidth: req.body.paperWidth,
      networkPrinter: req.body.networkPrinter,
    });
    res.json({
      success: true,
      message: "Customer bill printed successfully! 🧾",
      data: result,
    });
  } catch (error) {
    handlePrinterApiError(res, error, "POST /bill");
  }
};

/**
 * Print 80mm Kitchen Order Ticket (KOT)
 * POST /api/printer/kot
 */
const printKOTReceipt = async (req, res, next) => {
  try {
    console.log("📥 [POST /api/printer/kot] Received request body:", JSON.stringify(req.body, null, 2));

    const orderData = req.body.order || req.body;
    if (!orderData || !orderData.items || !Array.isArray(orderData.items)) {
      return res.status(400).json({
        success: false,
        message: "Order data object with an items array is required.",
      });
    }

    const result = await printerService.printKOT(orderData, {
      paperWidth: req.body.paperWidth,
      networkPrinter: req.body.networkPrinter,
    });
    res.json({
      success: true,
      message: "Kitchen order ticket routed & printed successfully! 👨‍🍳",
      data: result,
    });
  } catch (error) {
    handlePrinterApiError(res, error, "POST /kot");
  }
};

/**
 * Test connectivity to a network (IP:port) printer via the connected agent.
 * POST /api/printer/network/test
 */
const testNetworkPrinter = async (req, res, next) => {
  try {
    const { ip, port } = req.body;
    if (!ip) {
      return res.status(400).json({ success: false, message: "IP address is required." });
    }
    const result = await printerService.testNetworkPrinter(ip, port || 9100);
    res.json({ success: !!result.success, message: result.success ? "Network printer reachable." : result.error, data: result });
  } catch (error) {
    handlePrinterApiError(res, error, "POST /network/test");
  }
};

module.exports = {
  getPrinterStatus,
  getPrinterPorts,
  updatePrinterConfig,
  reconnectPrinter,
  printTestReceipt,
  printCustomerBillReceipt,
  printKOTReceipt,
  testNetworkPrinter,
};
