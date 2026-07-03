const express = require("express");
const router = express.Router();
const { getAllFeedbacks } = require("../controllers/feedback.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Admin only: view all customer feedback
router.get("/", authenticate, requireRole("ADMIN"), getAllFeedbacks);

module.exports = router;
