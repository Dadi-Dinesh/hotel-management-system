const express = require("express");
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { resolveStaffTenant, resolveTenant } = require("../middleware/tenant");

// Dual-use: anonymous customers AND the authenticated admin menu-management page.
router.get("/", resolveTenant, getCategories);

// Protected — admin only
router.post("/", authenticate, requireRole("ADMIN"), resolveStaffTenant, createCategory);
router.patch("/:id", authenticate, requireRole("ADMIN"), resolveStaffTenant, updateCategory);
router.delete("/:id", authenticate, requireRole("ADMIN"), resolveStaffTenant, deleteCategory);

module.exports = router;
