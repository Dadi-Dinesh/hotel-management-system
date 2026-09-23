const prisma = require("../../config/db");
const printerService = require("./printerService");
const printerLogger = require("./printerLogger");

/**
 * Auto Print (Phase 8) — best-effort, fire-and-forget silent printing via the
 * physical thermal agent when a restaurant has opted in. Silent/automatic
 * printing is only achievable through the local printer-agent (a real OS
 * process); browser/PDF/Bluetooth adapters require a foreground client tab
 * and a user gesture, so they are intentionally excluded from this path —
 * the client's own PrintService fallback chain still covers manual printing
 * for those. This never throws into its caller and never blocks the request
 * it's attached to, matching the existing logAudit() pattern.
 */
async function maybeAutoPrintKOT(order) {
  try {
    if (!order?.restaurantId) return;
    const settings = await prisma.printerSettings.findUnique({ where: { restaurantId: order.restaurantId } });
    if (!settings?.autoPrintKOT) return;

    await printerService.printKOT(order);
    printerLogger.info(`🤖 [AutoPrint] KOT auto-printed for order #${order.orderNumber || order.id}`);
  } catch (err) {
    // Agent likely offline — that's fine, this is best-effort only.
    printerLogger.warn("🤖 [AutoPrint] KOT auto-print skipped/failed", { error: err.message });
  }
}

async function maybeAutoPrintBill(session) {
  try {
    if (!session?.restaurantId) return;
    const settings = await prisma.printerSettings.findUnique({ where: { restaurantId: session.restaurantId } });
    if (!settings?.autoPrintBill) return;

    await printerService.printBill(session);
    printerLogger.info(`🤖 [AutoPrint] Bill auto-printed for table ${session.table?.code || session.tableId}`);
  } catch (err) {
    printerLogger.warn("🤖 [AutoPrint] Bill auto-print skipped/failed", { error: err.message });
  }
}

module.exports = { maybeAutoPrintKOT, maybeAutoPrintBill };
