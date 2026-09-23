/**
 * reportGenerator — assembles a structured Daily/Weekly/Monthly report from
 * the other insight modules. Returns plain data (numbers + short narrative
 * strings built from those numbers) — the client renders it as PDF or a
 * "Copy Summary" text block; nothing here does any rendering itself.
 */
const prisma = require("../../config/db");
const { getTrendComparison, getRanges } = require("./trendAnalyzer");
const { getRecommendations } = require("./recommendationEngine");

function round2(n) {
  return Math.round((n || 0) * 100) / 100;
}

const PERIOD_TO_COMPARE = { daily: "today-yesterday", weekly: "week-week", monthly: "month-month" };
const PERIOD_LABEL = { daily: "Daily Report", weekly: "Weekly Report", monthly: "Monthly Report" };

async function generateReport(restaurantId, period, restaurantName) {
  const compareKind = PERIOD_TO_COMPARE[period] || "today-yesterday";
  const trend = await getTrendComparison(restaurantId, compareKind);
  const { currentStart, currentEnd } = getRanges(compareKind);

  const [topItems, feedbacks, recommendations] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { restaurantId, createdAt: { gte: currentStart, lt: currentEnd }, status: { not: "CANCELLED" } } },
      select: { quantity: true, price: true, menuItem: { select: { name: true } } },
    }),
    prisma.feedback.findMany({
      where: { restaurantId, createdAt: { gte: currentStart, lt: currentEnd } },
      select: { rating: true },
    }),
    getRecommendations(restaurantId),
  ]);

  const itemMap = new Map();
  topItems.forEach((i) => {
    const name = i.menuItem?.name || "Item";
    const cur = itemMap.get(name) || { quantity: 0, revenue: 0 };
    cur.quantity += i.quantity;
    cur.revenue += i.price * i.quantity;
    itemMap.set(name, cur);
  });
  const topSellers = Array.from(itemMap.entries())
    .map(([name, s]) => ({ name, quantity: s.quantity, revenue: round2(s.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const averageRating = feedbacks.length > 0 ? round2(feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length) : null;

  const narrative = buildNarrative({ period, trend, topSellers, averageRating, feedbackCount: feedbacks.length });

  return {
    period,
    title: PERIOD_LABEL[period] || "Report",
    restaurantName: restaurantName || "Your Restaurant",
    generatedAt: new Date().toISOString(),
    rangeLabel: trend.label,
    hasData: trend.hasData,
    revenue: trend.current.revenue,
    orderCount: trend.current.orderCount,
    averageOrderValue: trend.current.averageOrderValue,
    changes: trend.changes,
    previous: trend.previous,
    topSellers,
    averageRating,
    feedbackCount: feedbacks.length,
    recommendations: recommendations.slice(0, 5),
    narrative,
  };
}

function buildNarrative({ period, trend, topSellers, averageRating, feedbackCount }) {
  if (!trend.hasData) {
    return ["Not enough data yet for this period."];
  }
  const lines = [];
  const { revenue, orderCount, averageOrderValue } = trend.current;
  const rc = trend.changes.revenue;
  const periodNoun = period === "daily" ? "day" : period === "weekly" ? "week" : "month";

  if (orderCount === 0) {
    lines.push(`No orders have been placed this ${periodNoun} yet.`);
  } else {
    lines.push(
      `Revenue was ₹${revenue.toLocaleString("en-IN")} from ${orderCount} order${orderCount === 1 ? "" : "s"}${
        rc == null ? "." : ` — ${rc >= 0 ? "up" : "down"} ${Math.abs(rc)}% compared to the previous ${periodNoun}.`
      }`
    );
    lines.push(`Average order value was ₹${averageOrderValue.toLocaleString("en-IN")}.`);
  }

  if (topSellers.length > 0) {
    lines.push(`Best seller: "${topSellers[0].name}" with ${topSellers[0].quantity} sold (₹${topSellers[0].revenue.toLocaleString("en-IN")} revenue).`);
  }

  if (averageRating != null) {
    lines.push(`Average customer rating was ${averageRating}/5 across ${feedbackCount} review${feedbackCount === 1 ? "" : "s"}.`);
  } else {
    lines.push("No customer feedback was recorded in this period.");
  }

  return lines;
}

module.exports = { generateReport };
