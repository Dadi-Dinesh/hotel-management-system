const prisma = require("../config/db");

/**
 * Get all tables with their active session status
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
 * Toggle table active status
 * PATCH /api/tables/:id
 */
const toggleTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const table = await prisma.table.update({
      where: { id },
      data: { isActive },
    });

    res.json({
      success: true,
      message: `Table ${table.code} ${isActive ? "enabled" : "disabled"}.`,
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllTables, getTableByCode, toggleTable };
