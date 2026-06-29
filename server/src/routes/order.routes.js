const express = require("express");
const router = express.Router();
const {
  placeOrder,
  getOrders,
  acceptOrder,
  updateOrderStatus,
} = require("../controllers/order.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Public — customer places order
router.post("/", placeOrder);

// Protected — captain/admin
router.get("/", authenticate, requireRole("ADMIN", "CAPTAIN"), getOrders);
router.patch("/:id/accept", authenticate, requireRole("CAPTAIN", "ADMIN"), acceptOrder);
router.patch("/:id/status", authenticate, requireRole("CAPTAIN", "ADMIN"), updateOrderStatus);

module.exports = router;
