const express = require("express");
const router = express.Router();
const {
  placeOrder,
  getOrders,
  acceptOrder,
  updateOrderStatus,
  getKitchenAggregated,
  updateOrderItemStatus,
} = require("../controllers/order.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Public endpoints
router.post("/", placeOrder);
router.get("/kitchen/aggregated", getKitchenAggregated);

// Protected — captain / admin / kitchen
router.get("/", authenticate, requireRole("ADMIN", "CAPTAIN", "KITCHEN"), getOrders);
router.patch("/:id/accept", authenticate, requireRole("CAPTAIN", "ADMIN"), acceptOrder);
router.patch("/:id/status", authenticate, requireRole("CAPTAIN", "ADMIN"), updateOrderStatus);
router.patch("/items/:itemId/status", authenticate, requireRole("CAPTAIN", "ADMIN", "KITCHEN"), updateOrderItemStatus);

module.exports = router;
