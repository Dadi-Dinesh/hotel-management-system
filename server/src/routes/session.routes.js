const express = require("express");
const router = express.Router();
const {
  startSession,
  getSession,
  requestBill,
  getBillRequests,
  closeSession,
  submitFeedback,
} = require("../controllers/session.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Captain: fetch all BILL_REQUESTED sessions (must be before /:id)
router.get("/bill-requests", authenticate, requireRole("ADMIN", "CAPTAIN"), getBillRequests);

// Public — customer actions
router.post("/", startSession);
router.get("/:id", getSession);
router.patch("/:id/request-bill", requestBill);
router.post("/:id/feedback", submitFeedback);

// Protected — captain/admin close session
router.patch("/:id/close", authenticate, requireRole("ADMIN", "CAPTAIN"), closeSession);

module.exports = router;
