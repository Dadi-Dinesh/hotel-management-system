const prisma = require("../config/db");

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * Revenue / orders / average-order-value trend, bucketed by the requested period.
 * GET /api/admin/analytics/revenue-trend?period=today|week|month|year
 */
const getRevenueTrend = async (req, res, next) => {
  try {
    const period = ["today", "week", "month", "year"].includes(req.query.period) ? req.query.period : "week";
    const now = new Date();

    let rangeStart;
    if (period === "today") rangeStart = startOfDay(now);
    else if (period === "week") rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === "month") rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: rangeStart },
        status: { not: "CANCELLED" },
        ...(req.restaurantId ? { restaurantId: req.restaurantId } : {}),
      },
      select: { createdAt: true, items: { select: { price: true, quantity: true } } },
    });

    const bucketFor = (date) => {
      const d = new Date(date);
      if (period === "today") return { key: d.getHours(), label: `${String(d.getHours()).padStart(2, "0")}:00` };
      if (period === "year") return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_NAMES[d.getMonth()] };
      // week / month — bucket by calendar day
      const dayKey = startOfDay(d).getTime();
      return { key: dayKey, label: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}` };
    };

    const buckets = new Map();
    orders.forEach((order) => {
      const { key, label } = bucketFor(order.createdAt);
      const amount = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      if (!buckets.has(key)) buckets.set(key, { key, label, revenue: 0, orders: 0 });
      const bucket = buckets.get(key);
      bucket.revenue += amount;
      bucket.orders += 1;
    });

    // Ensure every bucket in the range exists (even with zero orders) so charts don't show gaps.
    if (period === "today") {
      for (let h = 0; h <= now.getHours(); h++) {
        if (!buckets.has(h)) buckets.set(h, { key: h, label: `${String(h).padStart(2, "0")}:00`, revenue: 0, orders: 0 });
      }
    } else if (period === "year") {
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!buckets.has(key)) buckets.set(key, { key, label: MONTH_NAMES[d.getMonth()], revenue: 0, orders: 0 });
      }
    } else {
      const days = period === "today" ? 1 : period === "week" ? 7 : 30;
      for (let i = 0; i < days; i++) {
        const d = startOfDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
        const key = d.getTime();
        if (!buckets.has(key)) buckets.set(key, { key, label: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`, revenue: 0, orders: 0 });
      }
    }

    const series = Array.from(buckets.values())
      .sort((a, b) => (typeof a.key === "number" && typeof b.key === "number" ? a.key - b.key : String(a.key).localeCompare(String(b.key))))
      .map((b) => ({
        ...b,
        revenue: Math.round(b.revenue * 100) / 100,
        averageOrderValue: b.orders > 0 ? Math.round((b.revenue / b.orders) * 100) / 100 : 0,
      }));

    res.json({ success: true, data: { period, series } });
  } catch (error) {
    next(error);
  }
};

/**
 * Order-volume heatmap: day-of-week (0=Sun..6=Sat) x hour (0-23).
 * GET /api/admin/analytics/peak-hours
 */
const getPeakHours = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...(req.restaurantId ? { restaurantId: req.restaurantId } : {}),
      },
      select: { createdAt: true },
    });

    const matrix = {};
    DAY_NAMES.forEach((_, day) => {
      matrix[day] = Array.from({ length: 24 }, () => 0);
    });

    orders.forEach((order) => {
      const d = new Date(order.createdAt);
      matrix[d.getDay()][d.getHours()] += 1;
    });

    const cells = [];
    let maxCount = 0;
    DAY_NAMES.forEach((dayLabel, dayIndex) => {
      matrix[dayIndex].forEach((count, hour) => {
        cells.push({ day: dayIndex, dayLabel, hour, count });
        if (count > maxCount) maxCount = count;
      });
    });

    res.json({ success: true, data: { days: DAY_NAMES, cells, maxCount } });
  } catch (error) {
    next(error);
  }
};

/**
 * Best & worst selling menu items by revenue.
 * GET /api/admin/analytics/sellers?limit=6
 */
const getSellers = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20);

    const menuItems = await prisma.menuItem.findMany({
      where: req.restaurantId ? { restaurantId: req.restaurantId } : {},
      include: { category: true },
    });

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { not: "CANCELLED" },
          ...(req.restaurantId ? { restaurantId: req.restaurantId } : {}),
        },
      },
      select: { menuItemId: true, quantity: true, price: true },
    });

    const perfMap = {};
    orderItems.forEach((oi) => {
      if (!perfMap[oi.menuItemId]) perfMap[oi.menuItemId] = { quantity: 0, revenue: 0, orderCount: 0 };
      perfMap[oi.menuItemId].quantity += oi.quantity;
      perfMap[oi.menuItemId].revenue += oi.price * oi.quantity;
      perfMap[oi.menuItemId].orderCount += 1;
    });

    const enriched = menuItems.map((item) => {
      const perf = perfMap[item.id] || { quantity: 0, revenue: 0, orderCount: 0 };
      return {
        id: item.id,
        name: item.name,
        image: item.imageUrl || item.image || null,
        category: item.category?.name || "Uncategorized",
        isVeg: item.isVeg,
        price: item.price,
        quantity: perf.quantity,
        revenue: Math.round(perf.revenue * 100) / 100,
        orderCount: perf.orderCount,
      };
    });

    const maxRevenue = enriched.reduce((max, i) => Math.max(max, i.revenue), 0) || 1;
    enriched.forEach((i) => {
      i.popularity = Math.round((i.revenue / maxRevenue) * 100);
    });

    const sold = enriched.filter((i) => i.quantity > 0).sort((a, b) => b.revenue - a.revenue);
    const bestSellers = sold.slice(0, limit);
    // Worst performers: sold-but-slow items first, then never-sold items — both need attention.
    const neverSold = enriched.filter((i) => i.quantity === 0);
    const slowSold = [...sold].reverse().filter((i) => !bestSellers.includes(i));
    const worstSellers = [...neverSold, ...slowSold].slice(0, limit);

    res.json({ success: true, data: { bestSellers, worstSellers } });
  } catch (error) {
    next(error);
  }
};

/**
 * Full per-item performance list for the Menu Performance page
 * (search/sort/filter/pagination handled client-side — dataset is small).
 * GET /api/admin/analytics/menu-performance
 */
const getMenuPerformance = async (req, res, next) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      where: req.restaurantId ? { restaurantId: req.restaurantId } : {},
      include: { category: true },
    });

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { not: "CANCELLED" },
          ...(req.restaurantId ? { restaurantId: req.restaurantId } : {}),
        },
      },
      select: { menuItemId: true, quantity: true, price: true },
    });

    const perfMap = {};
    orderItems.forEach((oi) => {
      if (!perfMap[oi.menuItemId]) perfMap[oi.menuItemId] = { quantity: 0, revenue: 0, orderCount: 0 };
      perfMap[oi.menuItemId].quantity += oi.quantity;
      perfMap[oi.menuItemId].revenue += oi.price * oi.quantity;
      perfMap[oi.menuItemId].orderCount += 1;
    });

    const items = menuItems.map((item) => {
      const perf = perfMap[item.id] || { quantity: 0, revenue: 0, orderCount: 0 };
      return {
        id: item.id,
        name: item.name,
        image: item.imageUrl || item.image || null,
        category: item.category?.name || "Uncategorized",
        isVeg: item.isVeg,
        isAvailable: item.isAvailable,
        price: item.price,
        calories: item.calories,
        servingInformation: item.servingInformation,
        orders: perf.orderCount,
        quantitySold: perf.quantity,
        revenue: Math.round(perf.revenue * 100) / 100,
        averageQuantityPerOrder: perf.orderCount > 0 ? Math.round((perf.quantity / perf.orderCount) * 10) / 10 : 0,
      };
    });

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * Per-table analytics: sessions, revenue, average stay, orders, last used,
 * and a 7-day occupancy rate (share of the last 7 days the table spent in
 * an active/bill-requested session).
 * GET /api/admin/analytics/tables
 */
const getTableAnalytics = async (req, res, next) => {
  try {
    const tables = await prisma.table.findMany({
      where: req.restaurantId ? { restaurantId: req.restaurantId } : {},
      include: {
        sessions: {
          include: {
            orders: { include: { items: true } },
          },
        },
      },
      orderBy: { number: "asc" },
    });

    const now = new Date();
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const windowMs = now.getTime() - windowStart.getTime();

    const data = tables.map((table) => {
      const sessions = table.sessions;
      let revenue = 0;
      let ordersCount = 0;
      let totalStayMs = 0;
      let closedCount = 0;
      let occupiedMsInWindow = 0;
      let lastUsed = null;

      sessions.forEach((session) => {
        session.orders.forEach((order) => {
          if (order.status === "CANCELLED") return;
          ordersCount += 1;
          order.items.forEach((item) => {
            revenue += item.price * item.quantity;
          });
        });

        const sessionEnd = session.closedAt ? new Date(session.closedAt) : now;
        const sessionStart = new Date(session.createdAt);
        if (session.closedAt) {
          totalStayMs += sessionEnd.getTime() - sessionStart.getTime();
          closedCount += 1;
        }

        if (!lastUsed || sessionStart > lastUsed) lastUsed = sessionStart;

        // Overlap of [sessionStart, sessionEnd] with the trailing 7-day window
        const overlapStart = Math.max(sessionStart.getTime(), windowStart.getTime());
        const overlapEnd = Math.min(sessionEnd.getTime(), now.getTime());
        if (overlapEnd > overlapStart) occupiedMsInWindow += overlapEnd - overlapStart;
      });

      return {
        id: table.id,
        code: table.code,
        number: table.number,
        capacity: table.capacity,
        isActive: table.isActive,
        totalSessions: sessions.length,
        revenue: Math.round(revenue * 100) / 100,
        ordersCount,
        averageStayMinutes: closedCount > 0 ? Math.round(totalStayMs / closedCount / 60000) : 0,
        lastUsed,
        occupancyRatePercent: Math.round((occupiedMsInWindow / windowMs) * 1000) / 10,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Per-staff-member analytics, derived from acceptedByUserId (Order) and
 * closedByUserId (Session) — both added in Phase 5. Only populated going
 * forward; historical rows show as null/"Unattributed".
 * GET /api/admin/analytics/waiters
 */
const getWaiterAnalytics = async (req, res, next) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: { in: ["CAPTAIN", "ADMIN"] },
        ...(req.restaurantId ? { restaurantId: req.restaurantId } : {}),
      },
      include: {
        acceptedOrders: {
          where: req.restaurantId ? { restaurantId: req.restaurantId } : {},
          select: { id: true, createdAt: true, session: { select: { table: { select: { id: true } } } } },
        },
        closedSessions: {
          where: req.restaurantId ? { restaurantId: req.restaurantId } : {},
          select: { id: true, createdAt: true, closedAt: true, table: { select: { id: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const data = staff.map((user) => {
      const tableIds = new Set();
      user.acceptedOrders.forEach((o) => o.session?.table?.id && tableIds.add(o.session.table.id));
      user.closedSessions.forEach((s) => s.table?.id && tableIds.add(s.table.id));

      const serviceTimes = user.closedSessions
        .filter((s) => s.closedAt)
        .map((s) => new Date(s.closedAt).getTime() - new Date(s.createdAt).getTime());
      const avgServiceTimeMinutes =
        serviceTimes.length > 0
          ? Math.round(serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length / 60000)
          : 0;

      const mostRecentAction = [
        ...user.acceptedOrders.map((o) => new Date(o.createdAt)),
        ...user.closedSessions.map((s) => new Date(s.closedAt || s.createdAt)),
      ].sort((a, b) => b - a)[0];

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        tablesHandled: tableIds.size,
        ordersAccepted: user.acceptedOrders.length,
        billsGenerated: user.closedSessions.length,
        averageServiceTimeMinutes: avgServiceTimeMinutes,
        recentlyActive: !!mostRecentAction && mostRecentAction > recentCutoff,
        lastActionAt: mostRecentAction || null,
        hasTrackedActivity: user.acceptedOrders.length > 0 || user.closedSessions.length > 0,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRevenueTrend,
  getPeakHours,
  getSellers,
  getMenuPerformance,
  getTableAnalytics,
  getWaiterAnalytics,
};
