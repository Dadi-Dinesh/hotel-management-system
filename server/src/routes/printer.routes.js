const express = require("express");
const router = express.Router();
const {
  getPrinterStatus,
  getPrinterPorts,
  updatePrinterConfig,
  reconnectPrinter,
  printTestReceipt,
  printCustomerBillReceipt,
  printKOTReceipt,
  testNetworkPrinter,
} = require("../controllers/printer.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// These routes had NO auth middleware at all — anyone who knew the server's
// URL could trigger real print jobs (test/bill/kot), reconfigure the printer
// port/baud rate, or read printer status/available serial ports, with zero
// credentials. Automatic bill/KOT printing (on session close / order accept)
// never goes through these HTTP routes — it calls autoPrintService directly
// in-process — so nothing internal depends on these staying open. The Admin
// Dashboard's printer pages already attach a Bearer token to every request
// (see client/app/lib/api.js's axios interceptor), so this is a safe,
// non-breaking fix. Role scope matches the existing printer-settings routes
// in restaurant.routes.js (ADMIN + MANAGER).
router.use(authenticate, requireRole("ADMIN", "MANAGER"));

// Printer Hardware Management Endpoints
router.get("/status", getPrinterStatus);
router.get("/ports", getPrinterPorts);
router.post("/config", updatePrinterConfig);
router.post("/reconnect", reconnectPrinter);

// Print Action Endpoints
router.post("/test", printTestReceipt);
router.post("/bill", printCustomerBillReceipt);
router.post("/kot", printKOTReceipt);
router.post("/network/test", testNetworkPrinter);

module.exports = router;
