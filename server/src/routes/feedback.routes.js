const express = require("express");
const router = express.Router();
const { getAllFeedbacks } = require("../controllers/feedback.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { resolveStaffTenant } = require("../middleware/tenant");

// Admin only: view all customer feedback
router.get("/", authenticate, requireRole("ADMIN"), resolveStaffTenant, getAllFeedbacks);

module.exports = router;
