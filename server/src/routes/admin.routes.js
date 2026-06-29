const express = require("express");
const router = express.Router();
const {
  getStats,
  getOrderHistory,
  createUser,
  getUsers,
  deleteUser,
} = require("../controllers/admin.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// All admin routes are protected
router.use(authenticate, requireRole("ADMIN"));

router.get("/stats", getStats);
router.get("/orders", getOrderHistory);
router.get("/users", getUsers);
router.post("/users", createUser);
router.delete("/users/:id", deleteUser);

module.exports = router;
