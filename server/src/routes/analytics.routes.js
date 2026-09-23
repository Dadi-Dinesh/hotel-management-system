const express = require("express");
const router = express.Router();
const {
  getRevenueTrend,
  getPeakHours,
  getSellers,
  getMenuPerformance,
  getTableAnalytics,
  getWaiterAnalytics,
} = require("../controllers/analytics.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { resolveStaffTenant } = require("../middleware/tenant");

// Admin-only — same protection pattern as admin.routes.js.
router.use(authenticate, requireRole("ADMIN"), resolveStaffTenant);

router.get("/revenue-trend", getRevenueTrend);
router.get("/peak-hours", getPeakHours);
router.get("/sellers", getSellers);
router.get("/menu-performance", getMenuPerformance);
router.get("/tables", getTableAnalytics);
router.get("/waiters", getWaiterAnalytics);

module.exports = router;
