const express = require("express");
const router = express.Router();
const {
  getMenu,
  getMenuItem,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require("../controllers/menu.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { resolveStaffTenant, resolveTenant } = require("../middleware/tenant");

// Dual-use: anonymous customers (legacy, demo-scoped) AND the authenticated
// admin menu-management page (scoped to that staff member's own restaurant).
router.get("/", resolveTenant, getMenu);
router.get("/:id", getMenuItem);

// Protected — admin only
router.post("/", authenticate, requireRole("ADMIN"), resolveStaffTenant, upload.single("image"), addMenuItem);
router.patch("/:id", authenticate, requireRole("ADMIN"), resolveStaffTenant, upload.single("image"), updateMenuItem);
router.delete("/:id", authenticate, requireRole("ADMIN"), resolveStaffTenant, deleteMenuItem);

module.exports = router;
