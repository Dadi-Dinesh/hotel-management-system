const express = require("express");
const router = express.Router();
const { getOffers, createOffer, updateOffer, duplicateOffer, deleteOffer } = require("../controllers/offer.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { resolveStaffTenant } = require("../middleware/tenant");

// Admin-only — offer management is not customer-facing (no redemption flow yet).
router.use(authenticate, requireRole("ADMIN"), resolveStaffTenant);

router.get("/", getOffers);
router.post("/", createOffer);
router.patch("/:id", updateOffer);
router.post("/:id/duplicate", duplicateOffer);
router.delete("/:id", deleteOffer);

module.exports = router;
