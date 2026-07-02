const prisma = require("../config/db");
const { getIO } = require("../socket");
const { generateBillHTML } = require("../utils/kotGenerator");

/**
 * Start a new session for a table (or return existing active session)
 * POST /api/sessions
 */
const startSession = async (req, res, next) => {
  try {
    const { tableCode } = req.body;

    if (!tableCode) {
      return res.status(400).json({
        success: false,
        message: "Table code is required.",
      });
    }

    const table = await prisma.table.findUnique({
      where: { code: tableCode.toUpperCase() },
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found.",
      });
    }

    if (!table.isActive) {
      return res.status(400).json({
        success: false,
        message: "This table is currently not available.",
      });
    }

    // Check for existing active session
    const existingSession = await prisma.session.findFirst({
      where: {
        tableId: table.id,
        status: { in: ["ACTIVE", "BILL_REQUESTED"] },
      },
      include: {
        orders: {
          orderBy: { createdAt: "asc" },
          include: {
            items: { include: { menuItem: true } },
          },
        },
        table: true,
      },
    });

    if (existingSession) {
      return res.json({
        success: true,
        message: "Existing session found.",
        data: existingSession,
      });
    }

    // Create new session
    const session = await prisma.session.create({
      data: { tableId: table.id },
      include: {
        orders: true,
        table: true,
      },
    });

    // Notify captains about new table session
    const io = getIO();
    io.to("captains").emit("new-session", {
      tableCode: table.code,
      tableNumber: table.number,
      sessionId: session.id,
    });

    res.status(201).json({
      success: true,
      message: "New session started.",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get session details with all orders
 * GET /api/sessions/:id
 */
const getSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        table: true,
        orders: {
          orderBy: { createdAt: "asc" },
          include: {
            items: { include: { menuItem: true } },
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    // Calculate running total
    let runningTotal = 0;
    session.orders.forEach((order) => {
      if (order.status !== "CANCELLED") {
        order.items.forEach((item) => {
          runningTotal += item.price * item.quantity;
        });
      }
    });

    res.json({
      success: true,
      data: {
        ...session,
        runningTotal,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer requests bill
 * PATCH /api/sessions/:id/request-bill
 */
const requestBill = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.update({
      where: { id },
      data: { status: "BILL_REQUESTED" },
      include: {
        table: true,
        orders: {
          include: {
            items: { include: { menuItem: true } },
          },
        },
      },
    });

    // Calculate total
    let total = 0;
    session.orders.forEach((order) => {
      if (order.status !== "CANCELLED") {
        order.items.forEach((item) => {
          total += item.price * item.quantity;
        });
      }
    });

    // Generate bill HTML for printing
    const billHTML = generateBillHTML(session);

    // Notify captain about bill request
    const io = getIO();
    io.to("captains").emit("bill-requested", {
      sessionId: session.id,
      tableCode: session.table.code,
      tableNumber: session.table.number,
      total,
      billHTML,
    });

    res.json({
      success: true,
      message: "Bill requested. The waiter will bring your bill shortly.",
      data: { session, total, billHTML },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Close a session (after payment)
 * PATCH /api/sessions/:id/close
 */
const closeSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
      include: {
        table: true,
        orders: {
          include: {
            items: { include: { menuItem: true } },
          },
        },
      },
    });

    // Notify table that session is closed
    const io = getIO();
    io.to(`table-${session.table.code}`).emit("session-closed", {
      sessionId: session.id,
      tableCode: session.table.code,
    });

    res.json({
      success: true,
      message: `Session for table ${session.table.code} closed.`,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { startSession, getSession, requestBill, closeSession };
