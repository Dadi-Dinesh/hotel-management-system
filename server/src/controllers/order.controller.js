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

    // Notify captain via Socket.IO
    const io = getIO();
    io.to("captains").emit("new-order", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableCode: session.table.code,
      tableNumber: session.table.number,
      items: order.items.map((i) => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        price: i.price,
      })),
      createdAt: order.createdAt,
    });

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
    const kitchenHTML = generateKOTHTML(order, "KITCHEN");
    const waiterHTML = generateKOTHTML(order, "WAITER");

    // Notify the customer table that order was accepted
    const io = getIO();
    io.to(`table-${order.session.table.code}`).emit("order-accepted", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "ACCEPTED",
    });

    res.json({
      success: true,
      message: `Order #${order.orderNumber} accepted.`,
      data: {
        order,
        kot: {
          kitchen: { data: kitchenKOT, html: kitchenHTML },
          waiter: { data: waiterKOT, html: waiterHTML },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status
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

    // Notify the customer table about status change
    const io = getIO();
    io.to(`table-${order.session.table.code}`).emit("order-status-update", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });

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
