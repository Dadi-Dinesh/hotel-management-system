/**
 * health.controller — production health endpoints (Phase 12). Every check
 * here is real (a live DB query, the actual Socket.IO instance, the actual
 * printer-agent connection state) — never a hardcoded "ok".
 */
const prisma = require("../config/db");
const { getIO } = require("../socket");
const printerService = require("../services/printer/printerService");
const logger = require("../utils/logger");

const startedAt = Date.now();

async function checkDatabase() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    logger.error("Health check: database unreachable", { error: error.message });
    return { status: "down", error: error.message };
  }
}

function checkSocket() {
  try {
    const io = getIO();
    return { status: "up", connectedClients: io.engine?.clientsCount ?? null };
  } catch (error) {
    return { status: "down", error: error.message };
  }
}

function checkPrinter() {
  try {
    const status = printerService.getStatus();
    return {
      // The printer agent is an optional piece of hardware — "not connected"
      // is a normal, healthy state for a restaurant using browser/PDF
      // printing instead, so it's reported but never fails the health check.
      status: status.connected ? "connected" : "disconnected",
      kitchenMode: status.kitchenMode,
      lastError: status.lastError || null,
    };
  } catch (error) {
    return { status: "unknown", error: error.message };
  }
}

/**
 * Overall health — GET /api/health
 * Returns 200 when the API itself and the database (the two things every
 * request actually depends on) are healthy; 503 otherwise. Socket and
 * printer are reported but never bring the overall status down — a
 * restaurant using browser printing with no agent connected is healthy.
 */
const getHealth = async (req, res) => {
  const [database] = await Promise.all([checkDatabase()]);
  const socket = checkSocket();
  const printer = checkPrinter();

  const healthy = database.status === "up";

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? "healthy" : "unhealthy",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    checks: { database, socket, printer },
  });
};

const getDatabaseHealth = async (req, res) => {
  const result = await checkDatabase();
  res.status(result.status === "up" ? 200 : 503).json({ success: result.status === "up", ...result });
};

const getSocketHealth = (req, res) => {
  const result = checkSocket();
  res.status(result.status === "up" ? 200 : 503).json({ success: result.status === "up", ...result });
};

const getPrinterHealth = (req, res) => {
  const result = checkPrinter();
  res.status(200).json({ success: true, ...result });
};

module.exports = { getHealth, getDatabaseHealth, getSocketHealth, getPrinterHealth };
