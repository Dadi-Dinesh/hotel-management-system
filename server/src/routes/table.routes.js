const express = require("express");
const router = express.Router();
const { getAllTables, getTableByCode, toggleTable } = require("../controllers/table.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Public — customer QR landing
router.get("/:code", getTableByCode);

// Protected — admin
router.get("/", authenticate, requireRole("ADMIN", "CAPTAIN"), getAllTables);
router.patch("/:id", authenticate, requireRole("ADMIN"), toggleTable);

module.exports = router;
