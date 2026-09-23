const prisma = require("../config/db");
const { getIO } = require("../socket");
const { generateRawToken, hashToken, tokenMatches } = require("../utils/tokenUtils");
const { logAudit } = require("../utils/auditLog");

/**
 * Get all tables with their active session status and seating capacity
 * GET /api/tables  (staff — scoped to req.restaurantId; platform owner + no
 * restaurant selected sees every restaurant's tables)
 */
const getAllTables = async (req, res, next) => {
  try {
    const where = req.restaurantId ? { restaurantId: req.restaurantId } : {};

    const tables = await prisma.table.findMany({
      where,
      orderBy: [{ restaurantId: "asc" }, { number: "asc" }],
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
 * Get a specific table by its code (QR landing).
 * GET /api/tables/:code               — legacy, scoped to the demo restaurant
 * GET /api/restaurants/:slug/tables/:code — new, scoped by slug
 * Both resolve `req.restaurantId` via the `resolvePublicTenant` middleware.
 *
 * Secure QR (Phase 7): if the table has a qrTokenHash set, the request's
 * ?token= must match it. Tables without a hash (every table before this
 * phase, and any that hasn't opted in) behave exactly as before — no token
 * required. This is what keeps every existing QR code working unchanged.
 */
const getTableByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { token } = req.query;

    const table = await prisma.table.findUnique({
      where: { restaurantId_code: { restaurantId: req.restaurantId, code: code.toUpperCase() } },
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

    if (table.qrTokenHash && !tokenMatches(token, table.qrTokenHash)) {
      return res.status(403).json({
        success: false,
        message: "Invalid or missing QR token. Please scan the table's QR code again.",
      });
    }

    // Scan tracking — best-effort, never blocks the response.
    prisma.table.update({ where: { id: table.id }, data: { lastScannedAt: new Date() } }).catch(() => {});

    res.json({
      success: true,
      data: {
        ...table,
        activeSession: table.sessions[0] || null,
        sessions: undefined,
        qrTokenHash: undefined,
        restaurant: req.restaurant || undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new table (Admin only) — stamped with req.restaurantId.
 * POST /api/tables
 */
const createTable = async (req, res, next) => {
  try {
    const { code, number, capacity, isActive } = req.body;

    if (!req.restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Select a restaurant before managing tables.",
      });
    }

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

    // Check code uniqueness (within this restaurant only)
    const existingCode = await prisma.table.findUnique({
      where: { restaurantId_code: { restaurantId: req.restaurantId, code: uppercaseCode } },
    });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Table code "${uppercaseCode}" already exists.`,
      });
    }

    // Check number uniqueness (within this restaurant only)
    const existingNumber = await prisma.table.findUnique({
      where: { restaurantId_number: { restaurantId: req.restaurantId, number: tableNumber } },
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
        restaurantId: req.restaurantId,
      },
    });

    // Broadcast table update — tenant-scoped rooms
    try {
      const io = getIO();
      io.to(`restaurant:${req.restaurantId}:captains`).to(`restaurant:${req.restaurantId}:admins`).emit("table-updated", { action: "create", table });
    } catch (e) {
      console.error("Socket emit error:", e);
    }

    logAudit({ action: "table.created", restaurantId: req.restaurantId, userId: req.user?.id, metadata: { tableId: table.id, code: table.code } });

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
 * Update table details or active status (Admin only) — restaurant-scoped.
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

    if (req.restaurantId && existingTable.restaurantId !== req.restaurantId) {
      return res.status(404).json({
        success: false,
        message: "Table not found.",
      });
    }

    const dataToUpdate = {};

    if (code !== undefined && code !== null) {
      const uppercaseCode = String(code).toUpperCase().trim();
      if (uppercaseCode !== existingTable.code) {
        const codeCheck = await prisma.table.findUnique({
          where: { restaurantId_code: { restaurantId: existingTable.restaurantId, code: uppercaseCode } },
        });
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
        const numberCheck = await prisma.table.findUnique({
          where: { restaurantId_number: { restaurantId: existingTable.restaurantId, number: tableNumber } },
        });
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

    // Broadcast table update — tenant-scoped rooms
    try {
      const io = getIO();
      io.to(`restaurant:${table.restaurantId}:captains`).to(`restaurant:${table.restaurantId}:admins`).emit("table-updated", { action: "update", table });
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
 * Delete a table (Admin only) — restaurant-scoped.
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

    if (req.restaurantId && table.restaurantId !== req.restaurantId) {
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

    // Broadcast table update — tenant-scoped rooms
    try {
      const io = getIO();
      io.to(`restaurant:${table.restaurantId}:captains`).to(`restaurant:${table.restaurantId}:admins`).emit("table-updated", { action: "delete", tableId: id });
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

/**
 * QR Management Center overview — every table plus its QR/scan/order status.
 * GET /api/tables/qr-overview
 */
const getQROverview = async (req, res, next) => {
  try {
    const where = req.restaurantId ? { restaurantId: req.restaurantId } : {};

    const tables = await prisma.table.findMany({
      where,
      orderBy: { number: "asc" },
      include: {
        sessions: {
          where: { status: { in: ["ACTIVE", "BILL_REQUESTED"] } },
          select: { id: true },
        },
      },
    });

    const data = await Promise.all(
      tables.map(async (table) => {
        const lastOrder = await prisma.order.findFirst({
          where: { session: { tableId: table.id } },
          orderBy: { createdAt: "desc" },
          select: { orderNumber: true, createdAt: true, status: true },
        });
        return {
          id: table.id,
          code: table.code,
          number: table.number,
          isActive: table.isActive,
          isOccupied: table.sessions.length > 0,
          secureQR: !!table.qrTokenHash,
          qrTokenRegeneratedAt: table.qrTokenRegeneratedAt,
          lastScannedAt: table.lastScannedAt,
          lastOrder,
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate (or rotate) a table's secure QR token. Opts the table into
 * "secure mode" if it wasn't already — from then on, every table lookup and
 * session start for it requires the matching ?token=. Returns the RAW token
 * once; it is never retrievable again (only its hash is stored).
 * POST /api/tables/:id/regenerate-qr
 */
const regenerateQRToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table || (req.restaurantId && table.restaurantId !== req.restaurantId)) {
      return res.status(404).json({ success: false, message: "Table not found." });
    }

    const rawToken = generateRawToken();
    const updated = await prisma.table.update({
      where: { id },
      data: { qrTokenHash: hashToken(rawToken), qrTokenRegeneratedAt: new Date() },
    });

    logAudit({ action: "table.qr_regenerated", restaurantId: table.restaurantId, userId: req.user?.id, metadata: { tableCode: table.code } });

    res.json({ success: true, message: `New secure QR generated for Table ${table.code}.`, data: { table: updated, token: rawToken } });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk-regenerate QR tokens for several tables at once.
 * POST /api/tables/regenerate-qr-bulk  { tableIds: [...] }
 */
const regenerateQRTokenBulk = async (req, res, next) => {
  try {
    const { tableIds } = req.body;
    if (!Array.isArray(tableIds) || tableIds.length === 0) {
      return res.status(400).json({ success: false, message: "tableIds must be a non-empty array." });
    }

    const tables = await prisma.table.findMany({ where: { id: { in: tableIds } } });
    const results = [];
    for (const table of tables) {
      if (req.restaurantId && table.restaurantId !== req.restaurantId) continue;
      const rawToken = generateRawToken();
      await prisma.table.update({
        where: { id: table.id },
        data: { qrTokenHash: hashToken(rawToken), qrTokenRegeneratedAt: new Date() },
      });
      results.push({ tableId: table.id, code: table.code, number: table.number, token: rawToken });
    }

    logAudit({ action: "table.qr_regenerated_bulk", restaurantId: req.restaurantId, userId: req.user?.id, metadata: { count: results.length } });

    res.json({ success: true, message: `Regenerated QR for ${results.length} table(s).`, data: results });
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
  getQROverview,
  regenerateQRToken,
  regenerateQRTokenBulk,
};
