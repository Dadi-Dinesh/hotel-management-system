const express = require("express");
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Public
router.get("/", getCategories);

// Protected — admin only
router.post("/", authenticate, requireRole("ADMIN"), createCategory);
router.patch("/:id", authenticate, requireRole("ADMIN"), updateCategory);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteCategory);

module.exports = router;
