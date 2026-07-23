const prisma = require("../config/db");
const { getIO } = require("../socket");
const { generateKOTData, generateKOTHTML } = require("../utils/kotGenerator");

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

    // Create order with items
    const order = await prisma.order.create({
      data: {
        sessionId,
        items: {
          create: items.map((item) => {
            const menuItem = menuItems.find((m) => m.id === item.menuItemId);
            return {
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: menuItem.price,
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
        menuItem: i.menuItem,
        name: i.menuItem.name,
      })),
      createdAt: order.createdAt,
    };

    // Emit new-order event to waiters, captains, and admins rooms
    const io = getIO();
    console.log("Sending new-order event:", order.id);
    io.to("waiters").emit("new-order", orderPayload);
    io.to("captains").emit("new-order", orderPayload);
    io.to("admins").emit("new-order", orderPayload);

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
 * Captain accepts an order — triggers KOT print
 * PATCH /api/orders/:id/accept
 */
const acceptOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
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

    // Generate KOT data for both copies
    const kitchenKOT = generateKOTData(order, "KITCHEN");
    const waiterKOT = generateKOTData(order, "WAITER");

    // Generate printable HTML for both copies
    const kitchenHTML_80mm = generateKOTHTML(order, "KITCHEN", "80mm");
    const kitchenHTML_58mm = generateKOTHTML(order, "KITCHEN", "58mm");
    const kitchenHTML_A4 = generateKOTHTML(order, "KITCHEN", "A4");

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

    // Notify customer table, waiters, and admin
    const io = getIO();
    console.log("Sending order-accepted event:", order.id);
    io.to(tableCode).emit("order-accepted", statusPayload);
    io.to(`table:${tableCode}`).emit("order-accepted", statusPayload);
    io.to("waiters").emit("order-status-update", statusPayload);
    io.to("admins").emit("order-status-update", statusPayload);

    res.json({
      success: true,
      message: `Order #${order.orderNumber} accepted.`,
      data: {
        order,
        kot: {
          kitchen: {
            data: kitchenKOT,
            html: kitchenHTML_80mm,
            formats: {
              "80mm": kitchenHTML_80mm,
              "58mm": kitchenHTML_58mm,
              "A4": kitchenHTML_A4,
            },
          },
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
 * Update order status (captain changes: PREPARING → SERVED etc.)
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

    const order = await prisma.order.update({
      where: { id },
      data: { status },
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
    console.log(`Sending order-status-update event (${order.status}):`, order.id);
    io.to(tableCode).emit("order-status-update", statusPayload);
    io.to(`table:${tableCode}`).emit("order-status-update", statusPayload);
    io.to("waiters").emit("order-status-update", statusPayload);
    io.to("admins").emit("order-status-update", statusPayload);

    res.json({
      success: true,
      message: `Order #${order.orderNumber} status updated to ${status}.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { placeOrder, getOrders, acceptOrder, updateOrderStatus };
