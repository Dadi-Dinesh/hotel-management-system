const prisma = require("../config/db");
const { getIO } = require("../socket");
const { generateBillHTML } = require("../utils/kotGenerator");
const { tokenMatches } = require("../utils/tokenUtils");
const { maybeAutoPrintBill } = require("../services/printer/autoPrintService");
const { logAudit } = require("../utils/auditLog");

/**
 * Start a new session for a table (or return existing active session)
 * POST /api/sessions
 */
const startSession = async (req, res, next) => {
  try {
    const { tableCode, token } = req.body;

    if (!tableCode) {
      return res.status(400).json({
        success: false,
        message: "Table code is required.",
      });
    }

    const table = await prisma.table.findUnique({
      where: { restaurantId_code: { restaurantId: req.restaurantId, code: tableCode.toUpperCase() } },
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

    // Secure QR (Phase 7): same rule as the table lookup — only enforced for
    // tables that have opted into secure mode (qrTokenHash set).
    if (table.qrTokenHash && !tokenMatches(token, table.qrTokenHash)) {
      return res.status(403).json({
        success: false,
        message: "Invalid or missing QR token. Please scan the table's QR code again.",
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
        feedbacks: true,
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
      data: { tableId: table.id, restaurantId: table.restaurantId },
      include: {
        orders: true,
        table: true,
      },
    });

    // Notify this restaurant's waiters, captains, and admins about the new table session
    const io = getIO();
    const sessionPayload = {
      tableCode: table.code,
      tableNumber: table.number,
      sessionId: session.id,
    };
    console.log("Sending new-session event:", session.id);
    io.to(`restaurant:${table.restaurantId}:waiters`).emit("new-session", sessionPayload);
    io.to(`restaurant:${table.restaurantId}:captains`).emit("new-session", sessionPayload);
    io.to(`restaurant:${table.restaurantId}:admins`).emit("new-session", sessionPayload);

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
        feedbacks: true,
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

    // Calculate total safely
    let total = 0;
    session.orders.forEach((order) => {
      if (order.status !== "CANCELLED") {
        order.items.forEach((item) => {
          total += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        });
      }
    });

    // Generate bill HTML for printing in multiple paper formats (80mm POS, 58mm POS, A4 Document)
    const billHTML = generateBillHTML(session, "80mm");
    const billHTML_58mm = generateBillHTML(session, "58mm");
    const billHTML_A4 = generateBillHTML(session, "A4");

    const billFormats = {
      "80mm": billHTML,
      "58mm": billHTML_58mm,
      "A4": billHTML_A4,
    };

    // Auto Print (Phase 8) — best-effort, never blocks this response.
    maybeAutoPrintBill(session).catch(() => {});

    // Notify this restaurant's waiters, captains, and admins about the bill request
    const io = getIO();
    const billPayload = {
      sessionId: session.id,
      tableCode: session.table.code,
      tableNumber: session.table.number,
      total,
      billHTML,
      billFormats,
    };
    console.log("Sending bill-requested event for table:", session.table.code);
    io.to(`restaurant:${session.restaurantId}:waiters`).emit("bill-requested", billPayload);
    io.to(`restaurant:${session.restaurantId}:captains`).emit("bill-requested", billPayload);
    io.to(`restaurant:${session.restaurantId}:admins`).emit("bill-requested", billPayload);

    res.json({
      success: true,
      message: "Bill requested. The waiter will bring your bill shortly.",
      data: { session, total, billHTML, billFormats },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all sessions currently awaiting bill payment (captain view)
 * GET /api/sessions/bill-requests
 */
const getBillRequests = async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        status: "BILL_REQUESTED",
        ...(req.restaurantId ? { restaurantId: req.restaurantId } : {}),
      },
      include: {
        table: true,
        orders: {
          include: {
            items: { include: { menuItem: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const billRequests = sessions.map((session) => {
      let total = 0;
      const sessionItems = [];
      session.orders.forEach((order) => {
        if (order.status !== "CANCELLED") {
          order.items.forEach((item) => {
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 1;
            const itemTotal = price * quantity;
            total += itemTotal;
            sessionItems.push({
              id: item.id,
              name: item.menuItem?.name || item.name || "Item",
              quantity,
              price,
              menuItem: item.menuItem,
            });
          });
        }
      });
      const billHTML = generateBillHTML(session, "80mm");
      const billHTML_58mm = generateBillHTML(session, "58mm");
      const billHTML_A4 = generateBillHTML(session, "A4");

      return {
        sessionId: session.id,
        tableCode: session.table.code,
        tableNumber: session.table.number,
        total,
        items: sessionItems,
        orders: session.orders,
        billHTML,
        billFormats: {
          "80mm": billHTML,
          "58mm": billHTML_58mm,
          "A4": billHTML_A4,
        },
      };
    });

    res.json({ success: true, data: billRequests });
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
        // Analytics-only — who closed it. Nullable, never required.
        closedByUserId: req.user?.id || undefined,
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

    // Notify table and this restaurant's waiters/admins that the session is closed
    const io = getIO();
    const closedPayload = {
      sessionId: session.id,
      tableCode: session.table.code,
    };
    console.log("Sending session-closed event for table:", session.table.code);
    io.to(session.table.code).emit("session-closed", closedPayload);
    io.to(`table:${session.table.code}`).emit("session-closed", closedPayload);
    io.to(`restaurant:${session.restaurantId}:table:${session.table.code}`).emit("session-closed", closedPayload);
    io.to(`restaurant:${session.restaurantId}:waiters`).emit("session-closed", closedPayload);
    io.to(`restaurant:${session.restaurantId}:captains`).emit("session-closed", closedPayload);
    io.to(`restaurant:${session.restaurantId}:admins`).emit("session-closed", closedPayload);

    const billTotal = session.orders.reduce((sum, o) => (o.status === "CANCELLED" ? sum : sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0)), 0);
    logAudit({ action: "bill.generated", restaurantId: session.restaurantId, userId: req.user?.id, metadata: { sessionId: session.id, tableCode: session.table.code, total: Math.round(billTotal * 100) / 100 } });

    res.json({
      success: true,
      message: `Session for table ${session.table.code} closed.`,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit feedback for a session
 * POST /api/sessions/:id/feedback
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ratings } = req.body;

    if (!Array.isArray(ratings) || ratings.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Ratings must be a non-empty array",
      });
    }

    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    await prisma.$transaction(
      ratings.map((rating) =>
        prisma.feedback.create({
          data: {
            sessionId: id,
            menuItemId: rating.menuItemId,
            rating: rating.rating,
            // Optional — older/unmodified clients simply omit this and it stays null.
            comment: typeof rating.comment === "string" && rating.comment.trim() ? rating.comment.trim().slice(0, 500) : null,
            restaurantId: session.restaurantId,
          },
        })
      )
    );

    res.json({
      success: true,
      message: "Feedback submitted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { startSession, getSession, requestBill, getBillRequests, closeSession, submitFeedback };
