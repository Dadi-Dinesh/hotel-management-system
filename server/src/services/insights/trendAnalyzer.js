/**
 * trendAnalyzer — real historical period-over-period comparisons
 * (today/yesterday, this-week/last-week, this-month/last-month). Every
 * number comes from actual Order rows in the given window; percentage
 * change is only computed when the prior period has data to divide by.
 */
const prisma = require("../../config/db");

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function round2(n) {
  return Math.round((n || 0) * 100) / 100;
}

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? null : 0;
  return round2(((current - previous) / previous) * 100);
}

function getRanges(compare, now = new Date()) {
  if (compare === "today-yesterday") {
    const todayStart = startOfDay(now);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    return { currentStart: todayStart, currentEnd: now, previousStart: yesterdayStart, previousEnd: todayStart, label: "Today vs Yesterday" };
  }
  if (compare === "week-week") {
    const dayOfWeek = now.getDay();
    const thisWeekStart = startOfDay(new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000));
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { currentStart: thisWeekStart, currentEnd: now, previousStart: lastWeekStart, previousEnd: thisWeekStart, label: "This Week vs Last Week" };
  }
  // month-month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { currentStart: thisMonthStart, currentEnd: now, previousStart: lastMonthStart, previousEnd: thisMonthStart, label: "This Month vs Last Month" };
}

async function summarize(restaurantId, start, end) {
  const orders = await prisma.order.findMany({
    where: { restaurantId, createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
    select: { items: { select: { price: true, quantity: true } } },
  });
  const revenue = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0);
  return { revenue: round2(revenue), orderCount: orders.length, averageOrderValue: orders.length > 0 ? round2(revenue / orders.length) : 0 };
}

/**
 * @param {string} compare - "today-yesterday" | "week-week" | "month-month"
 */
async function getTrendComparison(restaurantId, compare) {
  const valid = ["today-yesterday", "week-week", "month-month"];
  const normalized = valid.includes(compare) ? compare : "today-yesterday";
  const { currentStart, currentEnd, previousStart, previousEnd, label } = getRanges(normalized);

  const [current, previous] = await Promise.all([
    summarize(restaurantId, currentStart, currentEnd),
    summarize(restaurantId, previousStart, previousEnd),
  ]);

  return {
    compare: normalized,
    label,
    hasData: current.orderCount > 0 || previous.orderCount > 0,
    current,
    previous,
    changes: {
      revenue: pctChange(current.revenue, previous.revenue),
      orderCount: pctChange(current.orderCount, previous.orderCount),
      averageOrderValue: pctChange(current.averageOrderValue, previous.averageOrderValue),
    },
  };
}

module.exports = { getTrendComparison, getRanges };
