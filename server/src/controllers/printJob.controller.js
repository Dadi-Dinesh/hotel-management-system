const prisma = require("../config/db");
const { getIO } = require("../socket");

const DOCUMENT_TYPES = ["BILL", "KOT", "TEST"];
const ADAPTERS = ["THERMAL_AGENT", "BROWSER", "PDF", "NETWORK", "BLUETOOTH"];
const ACTIVE_STATUSES = ["PENDING", "PRINTING"];

function broadcast(restaurantId, job) {
  try {
    const io = getIO();
    if (io && restaurantId) {
      io.to(`restaurant:${restaurantId}:admins`).emit("print-job:update", job);
      io.to(`restaurant:${restaurantId}:captains`).emit("print-job:update", job);
    }
  } catch (e) {
    // Socket.IO not initialized yet — never block on this.
  }
}

/**
 * Record a print job — called by the client's PrintService after every
 * attempt (any adapter), so Queue/History reflect reality regardless of
 * which adapter actually executed it. Never blocks printing itself; this is
 * purely a durability/observability record.
 * POST /api/print-jobs
 */
const createPrintJob = async (req, res, next) => {
  try {
    const {
      documentType,
      adapter,
      status,
      tableCode,
      orderNumber,
      sessionId,
      printerName,
      errorMessage,
      payloadSnapshot,
    } = req.body;

    if (!req.restaurantId) {
      return res.status(400).json({ success: false, message: "No restaurant context for this print job." });
    }
    if (!DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ success: false, message: `documentType must be one of ${DOCUMENT_TYPES.join(", ")}` });
    }
    if (!ADAPTERS.includes(adapter)) {
      return res.status(400).json({ success: false, message: `adapter must be one of ${ADAPTERS.join(", ")}` });
    }

    const job = await prisma.printJob.create({
      data: {
        restaurantId: req.restaurantId,
        documentType,
        adapter,
        status: status && ["PENDING", "PRINTING", "COMPLETED", "FAILED"].includes(status) ? status : "COMPLETED",
        tableCode: tableCode || null,
        orderNumber: orderNumber ? String(orderNumber) : null,
        sessionId: sessionId || null,
        printerName: printerName || null,
        errorMessage: errorMessage || null,
        payloadSnapshot: payloadSnapshot || undefined,
        completedAt: status === "PENDING" || status === "PRINTING" ? null : new Date(),
      },
    });

    broadcast(req.restaurantId, job);
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

/**
 * List print jobs for this restaurant — used by both Queue (active only)
 * and History (everything) views.
 * GET /api/print-jobs?status=active|all&limit=50
 */
const listPrintJobs = async (req, res, next) => {
  try {
    if (!req.restaurantId) {
      return res.json({ success: true, data: [] });
    }

    const { status, limit } = req.query;
    const where = { restaurantId: req.restaurantId };
    if (status === "active") {
      where.status = { in: ACTIVE_STATUSES };
    } else if (status && status !== "all") {
      where.status = status;
    }

    const jobs = await prisma.printJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(limit, 10) || 50, 200),
    });

    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a job's status — used to move PENDING -> PRINTING -> COMPLETED/FAILED
 * as the client's PrintService works through the adapter fallback chain.
 * PATCH /api/print-jobs/:id
 */
const updatePrintJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.printJob.findUnique({ where: { id } });
    if (!existing || (req.restaurantId && existing.restaurantId !== req.restaurantId)) {
      return res.status(404).json({ success: false, message: "Print job not found." });
    }

    const { status, adapter, printerName, errorMessage, retryCount } = req.body;
    const data = {};
    if (status !== undefined) {
      data.status = status;
      if (status === "COMPLETED" || status === "FAILED") data.completedAt = new Date();
    }
    if (adapter !== undefined) data.adapter = adapter;
    if (printerName !== undefined) data.printerName = printerName;
    if (errorMessage !== undefined) data.errorMessage = errorMessage;
    if (retryCount !== undefined) data.retryCount = retryCount;

    const job = await prisma.printJob.update({ where: { id }, data });
    broadcast(job.restaurantId, job);
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a pending/printing job — marks FAILED with a cancellation note
 * rather than deleting, so history is never lost.
 * PATCH /api/print-jobs/:id/cancel
 */
const cancelPrintJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.printJob.findUnique({ where: { id } });
    if (!existing || (req.restaurantId && existing.restaurantId !== req.restaurantId)) {
      return res.status(404).json({ success: false, message: "Print job not found." });
    }
    if (!ACTIVE_STATUSES.includes(existing.status)) {
      return res.status(400).json({ success: false, message: "Only pending or printing jobs can be cancelled." });
    }

    const job = await prisma.printJob.update({
      where: { id },
      data: { status: "FAILED", errorMessage: "Cancelled by user.", completedAt: new Date() },
    });
    broadcast(job.restaurantId, job);
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPrintJob, listPrintJobs, updatePrintJob, cancelPrintJob };
