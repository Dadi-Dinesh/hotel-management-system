const express = require("express");
const router = express.Router();
const {
  startSession,
  getSession,
  requestBill,
  closeSession,
} = require("../controllers/session.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Public — customer actions
router.post("/", startSession);
router.get("/:id", getSession);
router.patch("/:id/request-bill", requestBill);

// Protected — captain/admin close session
router.patch("/:id/close", authenticate, requireRole("ADMIN", "CAPTAIN"), closeSession);

module.exports = router;
