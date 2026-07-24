const prisma = require("../config/db");

// Categories allowed in Kitchen Display System
const ALLOWED_CATEGORIES = [
  "veg curries",
  "non veg curries",
  "non-veg curries",
  "veg starters",
  "non veg starters",
  "non-veg starters",
  "fried rice",
];

// Categories explicitly excluded
const EXCLUDED_CATEGORIES = [
  "pulkas",
  "rotis",
  "beverages",
  "water bottles",
  "cool drinks",
  "ice cream",
  "pan",
  "desserts",
  "extras",
];

/**
 * Check if a category name is allowed in KDS
 */
const isKdsCategoryAllowed = (categoryName = "") => {
  if (!categoryName) return false;
  const nameLower = categoryName.trim().toLowerCase();
  
  if (EXCLUDED_CATEGORIES.some((exc) => nameLower.includes(exc))) {
    return false;
  }
  
  return ALLOWED_CATEGORIES.some((allowed) => {
    const normAllowed = allowed.replace(/-/g, " ");
    const normName = nameLower.replace(/-/g, " ");
    return normName === normAllowed || normName.includes(normAllowed);
  });
};

/**
 * Fetch and aggregate current pending/preparing dish quantities for the Kitchen Portal.
 * Does NOT include table numbers, prices, order IDs, notes, or SERVED items.
 */
const getKitchenAggregatedData = async () => {
  // Query active order items with their menuItem and category details
  const activeOrderItems = await prisma.orderItem.findMany({
    where: {
      status: { in: ["PENDING", "PREPARING"] },
      order: {
        status: { not: "CANCELLED" },
        session: {
          status: { in: ["ACTIVE", "BILL_REQUESTED"] },
        },
      },
    },
    include: {
      menuItem: {
        include: {
          category: true,
        },
      },
    },
  });

  // Aggregate quantities by dish name
  const aggregationMap = {};

  activeOrderItems.forEach((item) => {
    const categoryName = item.menuItem?.category?.name || "";
    if (!isKdsCategoryAllowed(categoryName)) {
      return;
    }

    const dishName = item.menuItem?.name || "Unknown Dish";
    if (!aggregationMap[dishName]) {
      aggregationMap[dishName] = {
        name: dishName,
        quantity: 0,
        categoryName: categoryName,
        isVeg: item.menuItem?.isVeg ?? true,
      };
    }

    aggregationMap[dishName].quantity += item.quantity;
  });

  // Filter out any items with 0 quantity and convert to sorted array
  const result = Object.values(aggregationMap)
    .filter((dish) => dish.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));

  return result;
};

module.exports = {
  isKdsCategoryAllowed,
  getKitchenAggregatedData,
};
