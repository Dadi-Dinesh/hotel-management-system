const express = require("express");
const router = express.Router();
const {
  listApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  requestMoreInfo,
  getPlatformStats,
  listWhatsAppMessages,
  resendWhatsAppMessageHandler,
} = require("../controllers/application.controller");
const {
  listClients,
  getClient,
  setClientStatus,
  sendClientCredentials,
  regenerateQrPackage,
  listActivity,
  getPlatformSettings,
} = require("../controllers/platform.controller");
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

// ServeSync clients (approved restaurants) — platform-level profile only.
router.get("/restaurants", listClients);
router.get("/restaurants/:id", getClient);
router.patch("/restaurants/:id/status", setClientStatus);
// Credential + QR provisioning — both rotate secrets, so rate-limited like approve.
const provisioningLimit = rateLimit({ windowMs: 60 * 1000, max: 20, message: "Too many provisioning requests — please slow down." });
router.post("/restaurants/:id/credentials", provisioningLimit, sendClientCredentials);
router.post("/restaurants/:id/qr-package", provisioningLimit, regenerateQrPackage);

// Platform activity feed (notifications) + settings
router.get("/activity", listActivity);
router.get("/settings", getPlatformSettings);

// WhatsApp Outbox & Manual Resend
router.get("/whatsapp-messages", listWhatsAppMessages);
router.post("/whatsapp-messages/:id/resend", resendWhatsAppMessageHandler);

module.exports = router;
