const express = require("express");
const { customerAccess } = require("../middleware/customerAccess");
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
const { resolveStaffTenant } = require("../middleware/tenant");
const { rateLimit } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { placeOrderSchema } = require("../validation/schemas");

// Public customer orders require a signed, live table/session capability.
// Generous rate limit — a real table placing several rounds of orders over a
// meal never comes close; this only stops automated/abusive submission bursts.
router.post(
  "/",
  rateLimit({ windowMs: 5 * 60 * 1000, max: 40, message: "Too many orders submitted — please wait a moment and try again." }),
  customerAccess({ allowClosed: true }), // Only an existing order can replay after closure; the controller rejects new orders.
  validate(placeOrderSchema),
  placeOrder
);

// Protected — captain / admin / kitchen. Aggregated KDS feed now requires auth
// (every real caller already sends a token) so it can be scoped per restaurant.
router.get("/kitchen/aggregated", authenticate, requireRole("ADMIN", "CAPTAIN", "KITCHEN"), resolveStaffTenant, getKitchenAggregated);
router.get("/", authenticate, requireRole("ADMIN", "CAPTAIN", "KITCHEN"), resolveStaffTenant, getOrders);
router.patch("/:id/accept", authenticate, requireRole("CAPTAIN", "ADMIN"), resolveStaffTenant, acceptOrder);
router.patch("/:id/status", authenticate, requireRole("CAPTAIN", "ADMIN"), resolveStaffTenant, updateOrderStatus);
router.patch("/items/:itemId/status", authenticate, requireRole("CAPTAIN", "ADMIN", "KITCHEN"), resolveStaffTenant, updateOrderItemStatus);

module.exports = router;
