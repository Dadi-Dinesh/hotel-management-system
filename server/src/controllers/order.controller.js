const prisma = require("../config/db");
const { getIO } = require("../socket");
const { generateKOTData, generateKOTHTML } = require("../utils/kotGenerator");
const { getKitchenAggregatedData } = require("../services/kds.service");
const { maybeAutoPrintKOT } = require("../services/printer/autoPrintService");

/**
 * Place a new order (customer)
 * POST /api/orders
 */
const placeOrder = async (req, res, next) => {
  try {
    const { sessionId, items } = req.body;

    if (!sessionId || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: "Session ID and at least one item are required.",
      });
    }

    // Verify session is active
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { table: true },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    if (session.status === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "This session has been closed.",
      });
    }

    // Fetch menu items to snapshot prices
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some items are unavailable or not found.",
      });
    }

    // Create order with items (status: PENDING by default)
    const order = await prisma.order.create({
      data: {
        sessionId,
        restaurantId: session.restaurantId,
        items: {
          create: items.map((item) => {
            const menuItem = menuItems.find((m) => m.id === item.menuItemId);
            return {
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: menuItem.price,
              status: "PENDING",
            };
          }),
        },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
        session: {
          include: { table: true },
        },
      },
    });

    // Full order payload for real-time state synchronization
    const orderPayload = {
      ...order,
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableCode: session.table.code,
      tableNumber: session.table.number,
      items: order.items.map((i) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        price: i.price,
        status: i.status || "PENDING",
        menuItem: i.menuItem,
        name: i.menuItem.name,
      })),
      createdAt: order.createdAt,
    };

    // Emit new-order event to this restaurant's waiters, captains, admins, and kitchen
    const io = getIO();
    const rid = session.restaurantId;
    console.log("Sending new-order event:", order.id);
    io.to(`restaurant:${rid}:waiters`).emit("new-order", orderPayload);
    io.to(`restaurant:${rid}:captains`).emit("new-order", orderPayload);
    io.to(`restaurant:${rid}:admins`).emit("new-order", orderPayload);
    io.to(`restaurant:${rid}:kitchen`).emit("new-order", orderPayload);

    // Emit real-time aggregated quantities update to this restaurant's kitchen room
    const aggregatedKitchen = await getKitchenAggregatedData(rid);
    io.to(`restaurant:${rid}:kitchen`).emit("kitchen-updated", aggregatedKitchen);
    io.to(`restaurant:${rid}:captains`).emit("kitchen-updated", aggregatedKitchen);
    io.to(`restaurant:${rid}:admins`).emit("kitchen-updated", aggregatedKitchen);

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get orders (captain: pending/all, admin: with filters)
 * GET /api/orders
 */
const getOrders = async (req, res, next) => {
  try {
    const { status, date, sessionId } = req.query;

    const where = {};

    if (req.restaurantId) {
      where.restaurantId = req.restaurantId;
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { menuItem: true },
        },
        session: {
          include: { table: true },
        },
      },
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

/**
 * Captain accepts an order — triggers ONLY ONE copy (Waiter Token) print
 * PATCH /api/orders/:id/accept
 */
const acceptOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.restaurantId) {
      const existing = await prisma.order.findUnique({ where: { id }, select: { restaurantId: true } });
      if (!existing || existing.restaurantId !== req.restaurantId) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        // Analytics-only — who accepted it. Nullable, never required, never
        // affects the accept flow itself (falls back to null if unauthenticated).
        acceptedByUserId: req.user?.id || undefined,
      },
      include: {
        items: {
          include: { menuItem: true },
        },
        session: {
          include: { table: true },
        },
      },
    });

    // Auto Print (Phase 8) — best-effort, never blocks this response.
    maybeAutoPrintKOT(order).catch(() => {});

    // Generate KOT data for Waiter copy ONLY (Single print requirement)
    const waiterKOT = generateKOTData(order, "WAITER");

    // Generate printable HTML for Waiter copy ONLY
    const waiterHTML_80mm = generateKOTHTML(order, "WAITER", "80mm");
    const waiterHTML_58mm = generateKOTHTML(order, "WAITER", "58mm");
    const waiterHTML_A4 = generateKOTHTML(order, "WAITER", "A4");

    const tableCode = order.session.table.code;

    const statusPayload = {
      ...order,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "ACCEPTED",
      tableCode,
    };

    // Notify customer table and this restaurant's waiters, captains, kitchen, and admin
    const io = getIO();
    const rid = order.restaurantId;
    console.log("Sending order-accepted event:", order.id);
    io.to(tableCode).emit("order-accepted", statusPayload);
    io.to(`table:${tableCode}`).emit("order-accepted", statusPayload);
    io.to(`restaurant:${rid}:table:${tableCode}`).emit("order-accepted", statusPayload);
    io.to(`restaurant:${rid}:waiters`).emit("order-status-update", statusPayload);
    io.to(`restaurant:${rid}:captains`).emit("order-status-update", statusPayload);
    io.to(`restaurant:${rid}:admins`).emit("order-status-update", statusPayload);
    io.to(`restaurant:${rid}:kitchen`).emit("order-status-update", statusPayload);

    // Emit updated kitchen aggregated data
    const aggregatedKitchen = await getKitchenAggregatedData(rid);
    io.to(`restaurant:${rid}:kitchen`).emit("kitchen-updated", aggregatedKitchen);

    res.json({
      success: true,
      message: `Order #${order.orderNumber} accepted.`,
      data: {
        order,
        kot: {
          waiter: {
            data: waiterKOT,
            html: waiterHTML_80mm,
            formats: {
              "80mm": waiterHTML_80mm,
              "58mm": waiterHTML_58mm,
              "A4": waiterHTML_A4,
            },
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update whole order status (captain changes: PREPARING → SERVED etc.)
 * PATCH /api/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "ACCEPTED", "PREPARING", "SERVED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    if (req.restaurantId) {
      const existing = await prisma.order.findUnique({ where: { id }, select: { restaurantId: true } });
      if (!existing || existing.restaurantId !== req.restaurantId) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        // Phase 10 — records prep duration for kitchen-performance insights.
        servedAt: status === "SERVED" ? new Date() : undefined,
        // Sync item statuses if whole order status changes to SERVED or CANCELLED or PREPARING
        items: status === "SERVED" || status === "PREPARING"
          ? { updateMany: { where: {}, data: { status } } }
          : undefined,
      },
      include: {
        items: { include: { menuItem: true } },
        session: { include: { table: true } },
      },
    });

    const tableCode = order.session.table.code;

    const statusPayload = {
      ...order,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      tableCode,
      statusLabel: {
        PREPARING: "Your order is being prepared 🍳",
        SERVED: "Your order has been served! Enjoy your meal 🍽️",
        CANCELLED: "Your order was cancelled",
        ACCEPTED: "Your order has been accepted! 🎉",
        PENDING: "Your order is pending",
      }[order.status] || order.status,
    };

    const io = getIO();
    const rid = order.restaurantId;
    console.log(`Sending order-status-update event (${order.status}):`, order.id);
    io.to(tableCode).emit("order-status-update", statusPayload);
    io.to(`table:${tableCode}`).emit("order-status-update", statusPayload);
    io.to(`restaurant:${rid}:table:${tableCode}`).emit("order-status-update", statusPayload);
    io.to(`restaurant:${rid}:waiters`).emit("order-status-update", statusPayload);
    io.to(`restaurant:${rid}:captains`).emit("order-status-update", statusPayload);
    io.to(`restaurant:${rid}:admins`).emit("order-status-update", statusPayload);
    io.to(`restaurant:${rid}:kitchen`).emit("order-status-update", statusPayload);

    // Broadcast live kitchen aggregation update
    const aggregatedKitchen = await getKitchenAggregatedData(rid);
    io.to(`restaurant:${rid}:kitchen`).emit("kitchen-updated", aggregatedKitchen);
    io.to(`restaurant:${rid}:captains`).emit("kitchen-updated", aggregatedKitchen);

    res.json({
      success: true,
      message: `Order #${order.orderNumber} status updated to ${status}.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get aggregated quantities for Kitchen Display System (KDS)
 * GET /api/orders/kitchen/aggregated
 */
const getKitchenAggregated = async (req, res, next) => {
  try {
    const aggregatedData = await getKitchenAggregatedData(req.restaurantId);
    res.json({
      success: true,
      data: aggregatedData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update individual OrderItem status (e.g., Captain clicks "Served" on a specific item)
 * PATCH /api/orders/items/:itemId/status
 */
const updateOrderItemStatus = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { status = "SERVED" } = req.body;

    const validStatuses = ["PENDING", "PREPARING", "SERVED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid item status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    if (req.restaurantId) {
      const existingItem = await prisma.orderItem.findUnique({ where: { id: itemId }, select: { order: { select: { restaurantId: true } } } });
      if (!existingItem || existingItem.order.restaurantId !== req.restaurantId) {
        return res.status(404).json({ success: false, message: "Order item not found." });
      }
    }

    // Update item status in database
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
      include: {
        menuItem: true,
        order: {
          include: {
            items: { include: { menuItem: true } },
            session: { include: { table: true } },
          },
        },
      },
    });

    const parentOrder = updatedItem.order;
    const allItemsServed = parentOrder.items.every((item) => item.status === "SERVED");

    // If all items are served, auto-update the parent Order status to SERVED
    let updatedParentOrder = parentOrder;
    if (allItemsServed && parentOrder.status !== "SERVED") {
      updatedParentOrder = await prisma.order.update({
        where: { id: parentOrder.id },
        data: { status: "SERVED", servedAt: new Date() },
        include: {
          items: { include: { menuItem: true } },
          session: { include: { table: true } },
        },
      });
    }

    const tableCode = updatedParentOrder.session.table.code;
    const rid = updatedParentOrder.restaurantId;
    const io = getIO();

    // Fetch updated kitchen aggregation
    const aggregatedKitchen = await getKitchenAggregatedData(rid);

    // Emit real-time events to this restaurant's relevant rooms
    const itemServedPayload = {
      itemId: updatedItem.id,
      orderId: parentOrder.id,
      orderNumber: parentOrder.orderNumber,
      menuItemId: updatedItem.menuItemId,
      itemName: updatedItem.menuItem.name,
      status: updatedItem.status,
      tableCode,
      aggregated: aggregatedKitchen,
    };

    console.log(`Sending item-served event (${updatedItem.menuItem.name} -> ${status}):`, updatedItem.id);
    io.to(`restaurant:${rid}:kitchen`).emit("item-served", itemServedPayload);
    io.to(`restaurant:${rid}:kitchen`).emit("kitchen-updated", aggregatedKitchen);
    io.to(`restaurant:${rid}:captains`).emit("item-served", itemServedPayload);
    io.to(`restaurant:${rid}:captains`).emit("kitchen-updated", aggregatedKitchen);
    io.to(`restaurant:${rid}:admins`).emit("item-served", itemServedPayload);

    // Notify customer table
    const orderStatusPayload = {
      ...updatedParentOrder,
      orderId: updatedParentOrder.id,
      orderNumber: updatedParentOrder.orderNumber,
      status: updatedParentOrder.status,
      tableCode,
      itemServed: {
        id: updatedItem.id,
        name: updatedItem.menuItem.name,
        status: updatedItem.status,
      },
    };

    io.to(tableCode).emit("order-status-update", orderStatusPayload);
    io.to(`table:${tableCode}`).emit("order-status-update", orderStatusPayload);
    io.to(`restaurant:${rid}:table:${tableCode}`).emit("order-status-update", orderStatusPayload);

    res.json({
      success: true,
      message: `Item '${updatedItem.menuItem.name}' marked as ${status}.`,
      data: {
        item: updatedItem,
        order: updatedParentOrder,
        kitchenAggregated: aggregatedKitchen,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  placeOrder,
  getOrders,
  acceptOrder,
  updateOrderStatus,
  getKitchenAggregated,
  updateOrderItemStatus,
};
