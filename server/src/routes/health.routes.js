const express = require("express");
const router = express.Router();
const { getHealth, getDatabaseHealth, getSocketHealth, getPrinterHealth } = require("../controllers/health.controller");

// Public, unauthenticated by design — this is what a hosting platform's
// health-check probe (Render, Railway, a load balancer, uptime monitor)
// calls, and it should never depend on credentials being configured right.
router.get("/", getHealth);
router.get("/db", getDatabaseHealth);
router.get("/socket", getSocketHealth);
router.get("/printer", getPrinterHealth);

module.exports = router;
