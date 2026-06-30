const express = require("express");
const router = express.Router();
const {
  submitRatings,
  getMenuRatings,
  getAdminReviews,
  getAdminStats,
} = require("../controllers/rating.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Public endpoints
router.post("/", submitRatings);
router.get("/menu", getMenuRatings);

// Admin endpoints (protected)
router.get("/admin/reviews", authenticate, requireRole("ADMIN"), getAdminReviews);
router.get("/admin/stats", authenticate, requireRole("ADMIN"), getAdminStats);

module.exports = router;
