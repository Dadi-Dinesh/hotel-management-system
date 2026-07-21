const prisma = require("../config/db");
const { getIO } = require("../socket");

/**
 * Get all tables with their active session status and seating capacity
 * GET /api/tables
 */
const getAllTables = async (req, res, next) => {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: "asc" },
      include: {
        sessions: {
          where: { status: { in: ["ACTIVE", "BILL_REQUESTED"] } },
          include: {
            orders: {
              include: {
                items: {
                  include: { menuItem: true },
                },
              },
            },
          },
        },
      },
    });

    // Shape the response — include active session info
    const shaped = tables.map((table) => ({
      ...table,
      activeSession: table.sessions[0] || null,
      sessions: undefined,
    }));

    res.json({ success: true, data: shaped });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific table by its code (QR landing)
 * GET /api/tables/:code
 */
const getTableByCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    const table = await prisma.table.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        sessions: {
          where: { status: { in: ["ACTIVE", "BILL_REQUESTED"] } },
          include: {
            orders: {
              orderBy: { createdAt: "asc" },
              include: {
                items: {
                  include: { menuItem: true },
                },
              },
            },
          },
        },
      },
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

    res.json({
      success: true,
      data: {
        ...table,
        activeSession: table.sessions[0] || null,
        sessions: undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new table (Admin only)
 * POST /api/tables
 */
const createTable = async (req, res, next) => {
  try {
    const { code, number, capacity, isActive } = req.body;

    if (!code || number === undefined || number === null) {
      return res.status(400).json({
        success: false,
        message: "Table code and number are required.",
      });
    }

    const uppercaseCode = String(code).toUpperCase().trim();
    const tableNumber = parseInt(number, 10);
    const tableCapacity = capacity ? parseInt(capacity, 10) : 4;

    if (isNaN(tableNumber) || tableNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Table number must be a positive integer.",
      });
    }

    if (isNaN(tableCapacity) || tableCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be at least 1 seat.",
      });
    }

    // Check code uniqueness
    const existingCode = await prisma.table.findUnique({
      where: { code: uppercaseCode },
    });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Table code "${uppercaseCode}" already exists.`,
      });
    }

    // Check number uniqueness
    const existingNumber = await prisma.table.findUnique({
      where: { number: tableNumber },
    });
    if (existingNumber) {
      return res.status(400).json({
        success: false,
        message: `Table number "${tableNumber}" already exists.`,
      });
    }

    const table = await prisma.table.create({
      data: {
        code: uppercaseCode,
        number: tableNumber,
        capacity: tableCapacity,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    // Broadcast table update
    try {
      const io = getIO();
      io.to("captains").to("admins").emit("table-updated", { action: "create", table });
    } catch (e) {
      console.error("Socket emit error:", e);
    }

    res.status(201).json({
      success: true,
      message: `Table ${table.code} created successfully.`,
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update table details or active status (Admin only)
 * PATCH /api/tables/:id
 */
const updateTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, number, capacity, isActive } = req.body;

    const existingTable = await prisma.table.findUnique({
      where: { id },
    });

    if (!existingTable) {
      return res.status(404).json({
        success: false,
        message: "Table not found.",
      });
    }

    const dataToUpdate = {};

    if (code !== undefined && code !== null) {
      const uppercaseCode = String(code).toUpperCase().trim();
      if (uppercaseCode !== existingTable.code) {
        const codeCheck = await prisma.table.findUnique({ where: { code: uppercaseCode } });
        if (codeCheck) {
          return res.status(400).json({
            success: false,
            message: `Table code "${uppercaseCode}" already exists.`,
          });
        }
        dataToUpdate.code = uppercaseCode;
      }
    }

    if (number !== undefined && number !== null) {
      const tableNumber = parseInt(number, 10);
      if (isNaN(tableNumber) || tableNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: "Table number must be a positive integer.",
        });
      }
      if (tableNumber !== existingTable.number) {
        const numberCheck = await prisma.table.findUnique({ where: { number: tableNumber } });
        if (numberCheck) {
          return res.status(400).json({
            success: false,
            message: `Table number "${tableNumber}" already exists.`,
          });
        }
        dataToUpdate.number = tableNumber;
      }
    }

    if (capacity !== undefined && capacity !== null) {
      const tableCapacity = parseInt(capacity, 10);
      if (isNaN(tableCapacity) || tableCapacity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be at least 1 seat.",
        });
      }
      dataToUpdate.capacity = tableCapacity;
    }

    if (isActive !== undefined) {
      dataToUpdate.isActive = Boolean(isActive);
    }

    const table = await prisma.table.update({
      where: { id },
      data: dataToUpdate,
    });

    // Broadcast table update
    try {
      const io = getIO();
      io.to("captains").to("admins").emit("table-updated", { action: "update", table });
    } catch (e) {
      console.error("Socket emit error:", e);
    }

    res.json({
      success: true,
      message: `Table ${table.code} updated.`,
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a table (Admin only)
 * DELETE /api/tables/:id
 */
const deleteTable = async (req, res, next) => {
  try {
    const { id } = req.params;

    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        sessions: {
          where: { status: { in: ["ACTIVE", "BILL_REQUESTED"] } },
        },
      },
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found.",
      });
    }

    if (table.sessions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Table ${table.code} because it has an active session. Close the session first.`,
      });
    }

    // Clean up closed sessions, orders, items, and feedback associated with this table before deleting
    const allSessions = await prisma.session.findMany({
      where: { tableId: id },
      select: { id: true },
    });

    const sessionIds = allSessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      await prisma.$transaction([
        prisma.feedback.deleteMany({ where: { sessionId: { in: sessionIds } } }),
        prisma.orderItem.deleteMany({ where: { order: { sessionId: { in: sessionIds } } } }),
        prisma.order.deleteMany({ where: { sessionId: { in: sessionIds } } }),
        prisma.session.deleteMany({ where: { tableId: id } }),
        prisma.table.delete({ where: { id } }),
      ]);
    } else {
      await prisma.table.delete({ where: { id } });
    }

    // Broadcast table update
    try {
      const io = getIO();
      io.to("captains").to("admins").emit("table-updated", { action: "delete", tableId: id });
    } catch (e) {
      console.error("Socket emit error:", e);
    }

    res.json({
      success: true,
      message: `Table ${table.code} deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTables,
  getTableByCode,
  createTable,
  updateTable,
  deleteTable,
};
