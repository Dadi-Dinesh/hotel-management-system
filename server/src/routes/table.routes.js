const express = require("express");
const router = express.Router();
const {
  getAllTables,
  getTableByCode,
  createTable,
  updateTable,
  deleteTable,
  getQROverview,
  regenerateQRToken,
  regenerateQRTokenBulk,
} = require("../controllers/table.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { resolveStaffTenant, resolvePublicTenant } = require("../middleware/tenant");
const { rateLimit } = require("../middleware/rateLimit");

// Shared across every public QR-scan lookup route in this file — generous
// enough for a full dining room scanning within the same minute, but still
// a real backstop against an automated table-code enumeration attempt.
const qrScanRateLimit = rateLimit({ windowMs: 60 * 1000, max: 30, message: "Too many scans — please wait a moment and try again." });

// Protected — admin & captain table listing
router.get("/", authenticate, requireRole("ADMIN", "CAPTAIN"), resolveStaffTenant, getAllTables);

// Protected — QR Management Center (must be registered before the public
// "/:code" catch-all below, or Express would treat "qr-overview" as a code)
router.get("/qr-overview", authenticate, requireRole("ADMIN"), resolveStaffTenant, getQROverview);
router.post("/regenerate-qr-bulk", authenticate, requireRole("ADMIN"), resolveStaffTenant, regenerateQRTokenBulk);
router.post("/:id/regenerate-qr", authenticate, requireRole("ADMIN"), resolveStaffTenant, regenerateQRToken);

// Protected — admin management (Create, Update/Modify, Delete)
router.post("/", authenticate, requireRole("ADMIN"), resolveStaffTenant, createTable);
router.patch("/:id", authenticate, requireRole("ADMIN"), resolveStaffTenant, updateTable);
router.delete("/:id", authenticate, requireRole("ADMIN"), resolveStaffTenant, deleteTable);

// Public — customer QR landing (legacy, un-prefixed — resolves to the demo
// restaurant). Registered LAST since it's a catch-all single-segment route.
router.get("/:code", qrScanRateLimit, resolvePublicTenant, getTableByCode);

module.exports = router;
