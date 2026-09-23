/**
 * recommendationEngine — turns the facts insightEngine/trendAnalyzer
 * already computed into plain-language suggestions. Every card is framed
 * as a recommendation ("Consider...") never a fact, and nothing here writes
 * to the database — recommendations are advisory only.
 */
const prisma = require("../../config/db");
const { getDailyInsights, getMenuIntelligence, getKitchenPerformance, getFeedbackInsights, formatHour } = require("./insightEngine");

/** Day-of-week skew for the single highest-revenue item, last 30 days —
 * powers the brief's exact "highlight X during weekdays" example. */
async function getTopItemWeekdaySkew(restaurantId, topItemId) {
  if (!topItemId) return null;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.orderItem.findMany({
    where: { menuItemId: topItemId, order: { restaurantId, createdAt: { gte: since }, status: { not: "CANCELLED" } } },
    select: { quantity: true, order: { select: { createdAt: true } } },
  });
  if (rows.length < 4) return null;

  let weekday = 0;
  let weekend = 0;
  rows.forEach((r) => {
    const day = new Date(r.order.createdAt).getDay();
    if (day === 0 || day === 6) weekend += r.quantity;
    else weekday += r.quantity;
  });
  const total = weekday + weekend;
  if (total === 0) return null;
  const weekdayShare = weekday / total;
  if (weekdayShare >= 0.7) return "WEEKDAY";
  if (weekdayShare <= 0.3) return "WEEKEND";
  return null;
}

/** Table with the most sessions in the last 7 days, for the staffing-style recommendation. */
async function getBusiestTable(restaurantId) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessions = await prisma.session.findMany({
    where: { restaurantId, createdAt: { gte: since } },
    select: { table: { select: { code: true } } },
  });
  if (sessions.length === 0) return null;
  const counts = new Map();
  sessions.forEach((s) => {
    const code = s.table?.code;
    if (!code) return;
    counts.set(code, (counts.get(code) || 0) + 1);
  });
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? { code: sorted[0][0], sessions: sorted[0][1] } : null;
}

async function getRecommendations(restaurantId) {
  const [daily, menu, kitchen, feedback] = await Promise.all([
    getDailyInsights(restaurantId),
    getMenuIntelligence(restaurantId),
    getKitchenPerformance(restaurantId),
    getFeedbackInsights(restaurantId),
  ]);

  const recommendations = [];

  // Kitchen delays
  const delayedCount = kitchen.delayedCount ?? daily.kitchenAlert?.delayedCount ?? 0;
  if (delayedCount > 0) {
    recommendations.push({
      id: "kitchen-delay",
      category: "KITCHEN",
      text: `Review the preparation workflow for delayed orders — ${delayedCount} order${delayedCount === 1 ? " is" : "s are"} currently running behind.`,
    });
  }

  // Peak-hour staffing
  if (daily.busyHour?.hasData && daily.busyHour.count >= 3) {
    recommendations.push({
      id: "peak-staffing",
      category: "STAFFING",
      text: `Consider preparing additional staff during the ${daily.busyHour.label} peak — it's today's busiest window.`,
    });
  }

  // Underperforming item
  const worst = menu.underperformingItems?.[0];
  if (worst && menu.hasData) {
    recommendations.push({
      id: "underperformer",
      category: "MENU",
      text: `Consider promoting or repositioning "${worst.name}" — it's selling slower than the rest of the menu over the last 30 days.`,
    });
  }

  // Weekday/weekend highlight for the top revenue item
  const topItem = menu.highRevenueItems?.[0];
  if (topItem) {
    const skew = await getTopItemWeekdaySkew(restaurantId, topItem.id);
    if (skew === "WEEKDAY") {
      recommendations.push({
        id: "weekday-highlight",
        category: "MENU",
        text: `Consider highlighting "${topItem.name}" during weekdays — most of its orders happen Monday through Friday.`,
      });
    } else if (skew === "WEEKEND") {
      recommendations.push({
        id: "weekend-highlight",
        category: "MENU",
        text: `Consider highlighting "${topItem.name}" on weekends — that's when it sells best.`,
      });
    }
  }

  // Feedback trend
  if (feedback.hasData && feedback.trendDirection === "DOWN") {
    recommendations.push({
      id: "feedback-dip",
      category: "FEEDBACK",
      text: "Customer ratings have dipped over the last two weeks — worth reviewing recent feedback for common concerns.",
    });
  }
  if (feedback.hasData && feedback.complaints?.length > 0) {
    const topComplaint = feedback.complaints[0];
    recommendations.push({
      id: "feedback-keyword",
      category: "FEEDBACK",
      text: `"${topComplaint.word}" came up repeatedly in recent feedback comments — may be worth a closer look.`,
    });
  }

  // Busiest table
  const busiestTable = await getBusiestTable(restaurantId);
  if (busiestTable && busiestTable.sessions >= 3) {
    recommendations.push({
      id: "busiest-table",
      category: "OPERATIONS",
      text: `Table ${busiestTable.code} has been your most active table this week (${busiestTable.sessions} sessions) — consider prioritizing service there during peak hours.`,
    });
  }

  return recommendations;
}

module.exports = { getRecommendations };
