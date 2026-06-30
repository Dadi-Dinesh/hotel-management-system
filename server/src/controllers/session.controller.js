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

    // Update table occupancy status
    await prisma.table.update({
      where: { id: table.id },
      data: { occupied: true, releasedTime: null },
    });

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
        billRequests: true,
        orders: {
          orderBy: { createdAt: "asc" },
          include: {
            items: {
              include: { menuItem: true },
            },
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

    // Fetch the session first to validate orders
    const currentSession = await prisma.session.findUnique({
      where: { id },
      include: {
        table: true,
        orders: {
          include: {
            items: { include: { menuItem: true } },
          },
        },
      },
    });

    if (!currentSession) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    const activeOrders = currentSession.orders.filter((o) => o.status !== "CANCELLED");
    if (activeOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A customer can request the bill only if there is an active order.",
      });
    }

    // Check for existing pending or accepted bill requests for these orders
    const existingRequests = await prisma.billRequest.findMany({
      where: {
        orderId: { in: activeOrders.map((o) => o.id) },
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });

    if (existingRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message: "A bill request is already pending or accepted for this session.",
      });
    }

    // Update session status
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

    // Create a BillRequest record for each active order
    for (const order of activeOrders) {
      await prisma.billRequest.create({
        data: {
          orderId: order.id,
          tableId: session.tableId,
          sessionId: session.id,
          status: "PENDING",
        },
      });
    }

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

    // Automatically release the table when session is closed
    await prisma.table.update({
      where: { id: session.tableId },
      data: {
        occupied: false,
        releasedTime: new Date(),
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

/**
 * Get all pending/accepted bill requests
 * GET /api/sessions/bill-requests
 */
const getBillRequests = async (req, res, next) => {
  try {
    const requests = await prisma.billRequest.findMany({
      where: { status: { in: ["PENDING", "ACCEPTED"] } },
      include: {
        table: true,
        order: {
          include: {
            items: { include: { menuItem: true } },
            session: true,
          },
        },
      },
      orderBy: { requestTime: "asc" },
    });

    const shaped = requests.map((br) => {
      let total = 0;
      br.order.items.forEach((item) => {
        total += item.price * item.quantity;
      });
      return {
        id: br.id,
        orderId: br.orderId,
        orderNumber: br.order.orderNumber,
        tableId: br.tableId,
        tableCode: br.table.code,
        tableNumber: br.table.number,
        customerName: br.order.session?.customerName || null,
        requestTime: br.requestTime,
        total,
        status: br.status,
        sessionId: br.sessionId,
      };
    });

    res.json({ success: true, data: shaped });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept a bill request
 * PATCH /api/sessions/bill-requests/:id/accept
 */
const acceptBillRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const br = await prisma.billRequest.update({
      where: { id },
      data: { status: "ACCEPTED" },
      include: { table: true },
    });

    // Notify customer table that bill request has been accepted
    const io = getIO();
    io.to(`table-${br.table.code}`).emit("bill-accepted", {
      sessionId: br.sessionId,
      tableCode: br.table.code,
    });

    // Notify other captains
    io.to("captains").emit("bill-request-accepted", {
      requestId: br.id,
      sessionId: br.sessionId,
      status: "ACCEPTED",
    });

    res.json({
      success: true,
      message: "Bill request accepted by Captain.",
      data: br,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Print bill request and release the table
 * POST /api/sessions/bill-requests/:id/print
 */
const printBillRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const captain = req.user; // Captain printing the bill

    if (!captain) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Captain login required.",
      });
    }

    const br = await prisma.billRequest.findUnique({
      where: { id },
      include: {
        table: true,
        order: {
          include: {
            items: { include: { menuItem: true } },
          },
        },
        session: {
          include: {
            orders: {
              where: { status: { not: "CANCELLED" } },
              include: {
                items: { include: { menuItem: true } },
              },
            },
            table: true,
          },
        },
      },
    });

    if (!br) {
      return res.status(404).json({
        success: false,
        message: "Bill request not found.",
      });
    }

    // Calculate grand total for session
    let totalAmount = 0;
    br.session.orders.forEach((order) => {
      order.items.forEach((item) => {
        totalAmount += item.price * item.quantity;
      });
    });

    // Generate unique bill number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.bill.count();
    const billNumber = `BILL-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    // Transaction for atomic db push & release
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Bill
      const bill = await tx.bill.create({
        data: {
          billNumber,
          printedTime: new Date(),
          printedById: captain.id,
          totalAmount,
          paymentStatus: "PENDING",
          printStatus: "PRINTED",
          orderId: br.orderId,
          sessionId: br.sessionId,
        },
      });

      // 2. Update status of all bill requests for this session to PRINTED
      await tx.billRequest.updateMany({
        where: { sessionId: br.sessionId },
        data: { status: "PRINTED" },
      });

      // 3. Mark non-cancelled orders in session as SERVED (Completed)
      await tx.order.updateMany({
        where: {
          sessionId: br.sessionId,
          status: { not: "CANCELLED" },
        },
        data: { status: "SERVED" },
      });

      // 4. Close the session
      await tx.session.update({
        where: { id: br.sessionId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
        },
      });

      // 5. Release Table: occupied = false, releasedTime = now()
      await tx.table.update({
        where: { id: br.tableId },
        data: {
          occupied: false,
          releasedTime: new Date(),
        },
      });

      return bill;
    });

    // Generate bill HTML for printing
    const billHTML = generateBillHTML(br.session);

    // Notify customer table that session is closed (bill printed)
    const io = getIO();
    io.to(`table-${br.table.code}`).emit("session-closed", {
      sessionId: br.sessionId,
      tableCode: br.table.code,
    });

    // Notify captains
    io.to("captains").emit("bill-request-printed", {
      sessionId: br.sessionId,
    });

    res.json({
      success: true,
      message: "Bill printed and table released successfully.",
      data: {
        bill: result,
        billHTML,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startSession,
  getSession,
  requestBill,
  closeSession,
  getBillRequests,
  acceptBillRequest,
  printBillRequest,
};
