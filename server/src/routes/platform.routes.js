const express = require("express");
const router = express.Router();
const {
  listApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  requestMoreInfo,
  getPlatformStats,
  listPlatformRestaurants,
  togglePlatformRestaurantStatus,
  resendPlatformRestaurantKit,
  listWhatsAppMessages,
  resendWhatsAppMessageHandler,
} = require("../controllers/application.controller");
const { authenticate, requirePlatformOwner } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { rejectApplicationSchema, requestMoreInfoSchema } = require("../validation/schemas");

// Platform Owner only — application review/approval and multi-restaurant management
// is gated by restaurantId === null on the account.
router.use(authenticate, requirePlatformOwner);

// Overview statistics
router.get("/stats", getPlatformStats);

// Restaurant Applications
router.get("/applications", listApplications);
router.get("/applications/:id", getApplication);

// Approve is the one route that actually provisions a tenant (real DB
// writes: restaurant + admin user + N tables) — rate-limited as a backstop
// against a compromised/malfunctioning session, not normal review usage.
router.post(
  "/applications/:id/approve",
  rateLimit({ windowMs: 60 * 1000, max: 20, message: "Too many approvals in a short window — please slow down." }),
  approveApplication
);
router.post("/applications/:id/reject", validate(rejectApplicationSchema), rejectApplication);
router.post("/applications/:id/request-info", validate(requestMoreInfoSchema), requestMoreInfo);

// All Restaurants Management (Platform Owner view)
router.get("/restaurants", listPlatformRestaurants);
router.patch("/restaurants/:id/toggle-status", togglePlatformRestaurantStatus);
router.post("/restaurants/:id/resend-kit", resendPlatformRestaurantKit);

// WhatsApp Outbox & Manual Resend
router.get("/whatsapp-messages", listWhatsAppMessages);
router.post("/whatsapp-messages/:id/resend", resendWhatsAppMessageHandler);

module.exports = router;
