const prisma = require("../config/db");
const logger = require("./logger");

/**
 * Lightweight audit-trail hook — records who did what, when. Never throws:
 * a logging failure must never break the action it's logging.
 */
async function logAudit({ action, restaurantId = null, userId = null, metadata = {} }) {
  try {
    await prisma.auditLog.create({
      data: { action, restaurantId, userId, metadata },
    });
  } catch (error) {
    logger.warn(`⚠️ [AuditLog] Failed to record audit entry: ${action}`, { error: error.message });
  }
}

module.exports = { logAudit };
