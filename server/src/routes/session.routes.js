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
const { resolveStaffTenant, resolvePublicTenant } = require("../middleware/tenant");
const { rateLimit } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { submitFeedbackSchema } = require("../validation/schemas");

// Captain: fetch all BILL_REQUESTED sessions (must be before /:id)
router.get("/bill-requests", authenticate, requireRole("ADMIN", "CAPTAIN"), resolveStaffTenant, getBillRequests);

// Public — customer actions (legacy, demo-scoped unless a restaurantSlug is supplied).
// Session start is effectively "the QR scan" — rate-limited generously so a
// genuine table of guests each scanning within the same minute is never affected.
router.post("/", rateLimit({ windowMs: 60 * 1000, max: 20, message: "Too many attempts — please wait a moment and rescan." }), resolvePublicTenant, startSession);
router.get("/:id", getSession);
router.patch("/:id/request-bill", requestBill);
router.post(
  "/:id/feedback",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: "Too many feedback submissions — please try again shortly." }),
  validate(submitFeedbackSchema),
  submitFeedback
);

// Protected — captain/admin close session
router.patch("/:id/close", authenticate, requireRole("ADMIN", "CAPTAIN"), closeSession);

module.exports = router;
