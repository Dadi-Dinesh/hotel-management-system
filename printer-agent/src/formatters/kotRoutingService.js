const printerLogger = require("../utils/printerLogger");

/**
 * Categories that require 2 copies (CHEF COPY + WAITER COPY) in NORMAL mode
 */
const KITCHEN_PREPARED_CATEGORIES = [
  "VEG STARTERS",
  "VEG STARTER",
  "NON VEG STARTERS",
  "NON-VEG STARTERS",
  "NON VEG STARTER",
  "NON-VEG STARTER",
  "VEG CURRIES",
  "VEG CURRY",
  "NON VEG CURRIES",
  "NON-VEG CURRIES",
  "NON VEG CURRY",
  "NON-VEG CURRY",
  "FRIED RICE",
  "RICE",
  "MAIN COURSE",
  "STARTERS",
  "CURRIES",
  "ROTI",
  "BREADS",
];

/**
 * KOTRoutingService - Determines KOT copy count, category routing, and order splitting based on Kitchen Mode ("LIVE" vs "NORMAL")
 */
class KOTRoutingService {
  /**
   * Check if a food item is a kitchen-prepared dish
   */
  isKitchenPreparedItem(item) {
    const categoryName = (
      item?.menuItem?.category?.name ||
      item?.categoryName ||
      item?.category ||
      ""
    ).toUpperCase().trim();

    const itemName = (
      item?.menuItem?.name ||
      item?.name ||
      ""
    ).toUpperCase().trim();

    // 1. Direct Category Name Match
    if (categoryName) {
      const match = KITCHEN_PREPARED_CATEGORIES.some((cat) => categoryName.includes(cat));
      if (match) return true;
    }

    // 2. Keyword Heuristics for Kitchen Dishes
    const kitchenKeywords = [
      "RICE", "CURRY", "MASALA", "PANEER", "CHICKEN", "MUTTON", "EGG", "FISH", "PRAWN", "STARTER", "FRY",
      "TIKKA", "KEBAB", "BIRYANI", "ROTI", "PULKA", "NAAN", "PARATHA", "MANCHURIAN", "NOODLES", "GOBI", "ALOO"
    ];

    return kitchenKeywords.some((kw) => itemName.includes(kw));
  }

  /**
   * Route an order into KOT print jobs based on Kitchen Mode ("LIVE" vs "NORMAL")
   * @param {Object} order - Incoming order payload
   * @param {string} mode - "LIVE" or "NORMAL"
   * @returns {Array} Array of job objects { order, copyLabel }
   */
  routeOrder(order = {}, mode = "LIVE") {
    const items = Array.isArray(order.items) ? order.items : [];

    printerLogger.info(`📋 [KOTRoutingService] Routing order #${order.orderNumber || order.id} (Mode: ${mode}, Items: ${items.length})`);

    // MODE 1: LIVE MODE -> Exactly 1 WAITER COPY for the entire order
    if (mode === "LIVE" || items.length === 0) {
      return [
        {
          order,
          copyLabel: "WAITER COPY",
        },
      ];
    }

    // MODE 2: NORMAL MODE -> Split into Kitchen-Prepared vs Ready-To-Serve items
    const kitchenItems = [];
    const readyItems = [];

    items.forEach((item) => {
      if (this.isKitchenPreparedItem(item)) {
        kitchenItems.push(item);
      } else {
        readyItems.push(item);
      }
    });

    const jobs = [];

    // 1. Kitchen-prepared items get 2 copies: CHEF COPY + WAITER COPY
    if (kitchenItems.length > 0) {
      const kitchenOrderPayload = { ...order, items: kitchenItems };
      jobs.push({ order: kitchenOrderPayload, copyLabel: "CHEF COPY" });
      jobs.push({ order: kitchenOrderPayload, copyLabel: "WAITER COPY" });
    }

    // 2. Ready-to-serve items get 1 copy: WAITER COPY only
    if (readyItems.length > 0) {
      const readyOrderPayload = { ...order, items: readyItems };
      jobs.push({ order: readyOrderPayload, copyLabel: "WAITER COPY" });
    }

    // Fallback if no items were categorized
    if (jobs.length === 0) {
      jobs.push({ order, copyLabel: "WAITER COPY" });
    }

    printerLogger.info(`📋 [KOTRoutingService] Generated ${jobs.length} KOT job(s) for order #${order.orderNumber || order.id}`);
    return jobs;
  }
}

const kotRoutingService = new KOTRoutingService();
module.exports = kotRoutingService;
