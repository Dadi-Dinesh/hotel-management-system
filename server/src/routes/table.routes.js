const express = require("express");
const router = express.Router();
const {
  getAllTables,
  getTableByCode,
  createTable,
  updateTable,
  deleteTable,
} = require("../controllers/table.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Public — customer QR landing
router.get("/:code", getTableByCode);

// Protected — admin & captain table listing
router.get("/", authenticate, requireRole("ADMIN", "CAPTAIN"), getAllTables);

// Protected — admin management (Create, Update/Modify, Delete)
router.post("/", authenticate, requireRole("ADMIN"), createTable);
router.patch("/:id", authenticate, requireRole("ADMIN"), updateTable);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteTable);

module.exports = router;
