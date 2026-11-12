const express = require("express");
const router = express.Router();
const {
  getRestaurantBySlug,
  getRestaurantSettings,
  listRestaurants,
  updateRestaurantSettings,
  setRestaurantActive,
} = require("../controllers/restaurant.controller");
const { getPrinterSettings, updatePrinterSettings } = require("../controllers/printerSettings.controller");
const { getTableByCode } = require("../controllers/table.controller");
const { getMenu } = require("../controllers/menu.controller");
const { getCategories } = require("../controllers/category.controller");
const { startSession } = require("../controllers/session.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { resolveStaffTenant, resolvePublicTenant } = require("../middleware/tenant");
const { upload } = require("../middleware/upload");
const { rateLimit } = require("../middleware/rateLimit");

// Platform Owner — list every restaurant (for the RestaurantSwitcher)
router.get("/", authenticate, requireRole("ADMIN"), resolveStaffTenant, listRestaurants);

// Provisioning starts with a reviewed application.
router.post("/", (req, res) => {
  res.status(410).json({ success: false, message: "Apply for a ServeSync account through the registration form." });
});

// Public — restaurant profile + slug-aware mirrors of the existing customer endpoints.
// These reuse the exact same controller functions as the legacy /api/tables,
// /api/menu, /api/categories, /api/sessions routes — resolvePublicTenant just
// resolves req.restaurantId from the :slug instead of falling back to the demo.
router.get("/:slug", getRestaurantBySlug);
router.get(
  "/:slug/tables/:code",
  rateLimit({ windowMs: 60 * 1000, max: 30, message: "Too many scans — please wait a moment and try again." }),
  resolvePublicTenant,
  getTableByCode
);
router.get("/:slug/menu", resolvePublicTenant, getMenu);
router.get("/:slug/categories", resolvePublicTenant, getCategories);
router.post(
  "/:slug/sessions",
  rateLimit({ windowMs: 60 * 1000, max: 20, message: "Too many attempts — please wait a moment and rescan." }),
  resolvePublicTenant,
  startSession
);

// Restaurant Admin — full settings record (tax/service-charge/etc. not in the public profile)
router.get("/:slug/settings", authenticate, requireRole("ADMIN"), resolveStaffTenant, getRestaurantSettings);

// Restaurant Admin — settings for their own restaurant
router.patch(
  "/:slug/settings",
  authenticate,
  requireRole("ADMIN"),
  resolveStaffTenant,
  upload.fields([{ name: "logo", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]),
  updateRestaurantSettings
);

// Restaurant Admin — Danger Zone: disable / re-enable (never deletes data)
router.patch("/:slug/status", authenticate, requireRole("ADMIN"), resolveStaffTenant, setRestaurantActive);

// Restaurant Admin/Manager — Universal Print Engine preferences (Phase 8)
router.get("/:slug/printer-settings", authenticate, requireRole("ADMIN", "MANAGER"), resolveStaffTenant, getPrinterSettings);
router.patch("/:slug/printer-settings", authenticate, requireRole("ADMIN", "MANAGER"), resolveStaffTenant, updatePrinterSettings);

module.exports = router;
