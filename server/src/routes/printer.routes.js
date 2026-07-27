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
} = require("../controllers/printer.controller");

// Printer Hardware Management Endpoints
router.get("/status", getPrinterStatus);
router.get("/ports", getPrinterPorts);
router.post("/config", updatePrinterConfig);
router.post("/reconnect", reconnectPrinter);

// Print Action Endpoints
router.post("/test", printTestReceipt);
router.post("/bill", printCustomerBillReceipt);
router.post("/kot", printKOTReceipt);

module.exports = router;
