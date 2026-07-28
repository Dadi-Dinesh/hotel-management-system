const printerLogger = require("./printerLogger");

/**
 * KOTRoutingService - Determines KOT copy count and labeling based on Kitchen Mode ("LIVE" vs "NORMAL")
 *
 * Rules:
 *   - LIVE MODE = ON  ("LIVE")   : Print 1 copy immediately -> Kitchen Copy
 *   - NORMAL MODE = OFF ("NORMAL"): Print 2 copies -> Kitchen Copy + Captain Copy
 */
class KOTRoutingService {
  /**
   * Route an order into KOT print jobs based on Kitchen Mode ("LIVE" vs "NORMAL")
   * @param {Object} order - Incoming order payload
   * @param {string} mode - "LIVE" or "NORMAL"
   * @returns {Array} Array of job objects { order, copyLabel }
   */
  routeOrder(order = {}, mode = "LIVE") {
    const items = Array.isArray(order.items) ? order.items : [];
    const normalizedMode = String(mode || "LIVE").toUpperCase();

    printerLogger.info(`📋 [KOTRoutingService] Routing order #${order.orderNumber || order.id} (Mode: ${normalizedMode}, Items: ${items.length})`);

    // MODE 1: LIVE KITCHEN MODE (ON) -> Exactly 1 Kitchen Copy
    if (normalizedMode === "LIVE" || items.length === 0) {
      return [
        {
          order,
          copyLabel: "Kitchen Copy",
        },
      ];
    }

    // MODE 2: NORMAL KITCHEN MODE (OFF) -> Exactly 2 copies: Kitchen Copy & Captain Copy
    return [
      {
        order,
        copyLabel: "Kitchen Copy",
      },
      {
        order,
        copyLabel: "Captain Copy",
      },
    ];
  }
}

const kotRoutingService = new KOTRoutingService();
module.exports = kotRoutingService;
