const express = require("express");
const router = express.Router();
const { getInvites, createInvite, revokeInvite, getInviteByCode, acceptInvite } = require("../controllers/invite.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { resolveStaffTenant } = require("../middleware/tenant");
const { rateLimit } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { createInviteSchema } = require("../validation/schemas");

// Public — the claim page and its submit action.
router.get("/:code", getInviteByCode);
router.post("/:code/accept", rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: "Too many attempts. Please try again in a few minutes." }), acceptInvite);

// Admin-only — manage invites for their own restaurant.
router.get("/", authenticate, requireRole("ADMIN"), resolveStaffTenant, getInvites);
router.post("/", authenticate, requireRole("ADMIN"), resolveStaffTenant, validate(createInviteSchema), createInvite);
router.delete("/:id", authenticate, requireRole("ADMIN"), resolveStaffTenant, revokeInvite);

module.exports = router;
