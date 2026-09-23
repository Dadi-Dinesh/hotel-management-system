const express = require("express");
const router = express.Router();
const {
  getStats,
  getOrderHistory,
  createUser,
  getUsers,
  deleteUser,
} = require("../controllers/admin.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { resolveStaffTenant } = require("../middleware/tenant");
const { rateLimit } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { createStaffUserSchema } = require("../validation/schemas");

// All admin routes are protected and tenant-scoped. The rate limit here is
// deliberately generous (an already-authenticated dashboard can legitimately
// fire many requests in a burst — live Socket.IO-triggered refetches, the
// AI Copilot panel loading several endpoints at once) — it exists as a
// backstop against a compromised/malfunctioning session, not normal usage.
router.use(authenticate, requireRole("ADMIN"), resolveStaffTenant, rateLimit({ windowMs: 5 * 60 * 1000, max: 400, message: "Too many requests — please slow down." }));

router.get("/stats", getStats);
router.get("/orders", getOrderHistory);
router.get("/users", getUsers);
router.post("/users", validate(createStaffUserSchema), createUser);
router.delete("/users/:id", deleteUser);

module.exports = router;
