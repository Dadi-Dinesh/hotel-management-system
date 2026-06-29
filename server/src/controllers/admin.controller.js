const prisma = require("../config/db");
const bcrypt = require("bcryptjs");

/**
 * Get dashboard stats
 * GET /api/admin/stats
 */
const getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total revenue (all time, from non-cancelled orders in closed sessions)
    const allOrders = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { not: "CANCELLED" },
        },
      },
      select: {
        price: true,
        quantity: true,
        order: {
          select: { createdAt: true },
        },
      },
    });

    let totalRevenue = 0;
    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;

    allOrders.forEach((item) => {
      const amount = item.price * item.quantity;
      totalRevenue += amount;

      const orderDate = new Date(item.order.createdAt);
      if (orderDate >= startOfToday) todayRevenue += amount;
      if (orderDate >= startOfWeek) weekRevenue += amount;
      if (orderDate >= startOfMonth) monthRevenue += amount;
    });

    // Total orders today
    const todayOrderCount = await prisma.order.count({
      where: { createdAt: { gte: startOfToday } },
    });

    // Active sessions
    const activeSessions = await prisma.session.count({
      where: { status: { in: ["ACTIVE", "BILL_REQUESTED"] } },
    });

    // Top selling items (all time)
    const topItems = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });

    // Enrich with menu item names
    const topItemDetails = await Promise.all(
      topItems.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { name: true, price: true, category: { select: { name: true } } },
        });
        return {
          name: menuItem?.name || "Deleted Item",
          category: menuItem?.category?.name || "Unknown",
          totalQuantity: item._sum.quantity,
        };
      })
    );

    // Top selling category
    const topCategories = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      _sum: { quantity: true },
    });

    const categoryMap = {};
    await Promise.all(
      topCategories.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          include: { category: true },
        });
        if (menuItem) {
          const catName = menuItem.category.name;
          categoryMap[catName] = (categoryMap[catName] || 0) + item._sum.quantity;
        }
      })
    );

    const topCategorySorted = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, totalQuantity: count }));

    res.json({
      success: true,
      data: {
        revenue: {
          total: totalRevenue,
          today: todayRevenue,
          thisWeek: weekRevenue,
          thisMonth: monthRevenue,
        },
        todayOrderCount,
        activeSessions,
        topSellingItems: topItemDetails,
        topSellingCategories: topCategorySorted.slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order history with date filters
 * GET /api/admin/orders
 */
const getOrderHistory = async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;

    const where = {};
    const now = new Date();

    if (period === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      where.createdAt = { gte: start };
    } else if (period === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      where.createdAt = { gte: start };
    } else if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      where.createdAt = { gte: start };
    } else if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { menuItem: true } },
        session: { include: { table: true } },
      },
    });

    // Calculate totals
    let totalAmount = 0;
    orders.forEach((order) => {
      if (order.status !== "CANCELLED") {
        order.items.forEach((item) => {
          totalAmount += item.price * item.quantity;
        });
      }
    });

    res.json({
      success: true,
      data: {
        orders,
        summary: {
          totalOrders: orders.length,
          totalAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a captain account
 * POST /api/admin/users
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || "CAPTAIN",
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json({
      success: true,
      message: `${role || "Captain"} account created for ${name}.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (captains)
 * GET /api/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user
 * DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: "User deleted.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats, getOrderHistory, createUser, getUsers, deleteUser };
