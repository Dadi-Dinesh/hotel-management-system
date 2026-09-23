const express = require("express");
const router = express.Router();
const { getOverview, getTrends, postAsk, getReport } = require("../controllers/insights.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { resolveStaffTenant } = require("../middleware/tenant");
const { rateLimit } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { askAISchema } = require("../validation/schemas");

// Admin-only — AI Copilot is an owner-facing feature, same protection
// pattern as analytics.routes.js.
router.use(authenticate, requireRole("ADMIN"), resolveStaffTenant);

router.get("/overview", getOverview);
router.get("/trends", getTrends);
router.get("/report", getReport);

// Ask AI runs a handful of real DB queries per question — rate-limited
// the same way other write-adjacent/expensive endpoints already are.
router.post(
  "/ask",
  rateLimit({ windowMs: 60 * 1000, max: 20, message: "Too many questions — please wait a moment before asking again." }),
  validate(askAISchema),
  postAsk
);

module.exports = router;
