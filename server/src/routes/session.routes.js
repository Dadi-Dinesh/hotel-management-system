const express = require("express");
const router = express.Router();
const {
  startSession,
  getSession,
  requestBill,
  closeSession,
  getBillRequests,
  acceptBillRequest,
  printBillRequest,
} = require("../controllers/session.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Public — customer actions
router.post("/", startSession);
router.get("/bill-requests", authenticate, requireRole("ADMIN", "CAPTAIN"), getBillRequests); // place before dynamic :id route
router.get("/:id", getSession);
router.patch("/:id/request-bill", requestBill);

// Protected — captain/admin close session
router.patch("/:id/close", authenticate, requireRole("ADMIN", "CAPTAIN"), closeSession);
router.patch("/bill-requests/:id/accept", authenticate, requireRole("ADMIN", "CAPTAIN"), acceptBillRequest);
router.post("/bill-requests/:id/print", authenticate, requireRole("ADMIN", "CAPTAIN"), printBillRequest);

module.exports = router;
