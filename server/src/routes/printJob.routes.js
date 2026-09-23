const express = require("express");
const router = express.Router();
const { createPrintJob, listPrintJobs, updatePrintJob, cancelPrintJob } = require("../controllers/printJob.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { resolveStaffTenant } = require("../middleware/tenant");

// Staff-only (Print Queue & History are internal operational views).
router.use(authenticate, requireRole("ADMIN", "MANAGER", "CAPTAIN", "KITCHEN"), resolveStaffTenant);

router.get("/", listPrintJobs);
router.post("/", createPrintJob);
router.patch("/:id", updatePrintJob);
router.patch("/:id/cancel", cancelPrintJob);

module.exports = router;
