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

// Public
router.get("/", getMenu);
router.get("/:id", getMenuItem);

// Protected — admin only
router.post("/", authenticate, requireRole("ADMIN"), upload.single("image"), addMenuItem);
router.patch("/:id", authenticate, requireRole("ADMIN"), upload.single("image"), updateMenuItem);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteMenuItem);

module.exports = router;
