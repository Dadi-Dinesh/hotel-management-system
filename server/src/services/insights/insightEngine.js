/**
 * insightEngine — computes every "AI Copilot" fact directly from this
 * restaurant's own orders/sessions/feedback. Nothing here invents a number:
 * every function either returns a value derived from real rows, or
 * `hasData: false` when there isn't enough history to say anything
 * meaningful yet (the brief's explicit "Not enough data yet" behavior).
 */
const prisma = require("../../config/db");
const { classifyComment, topKeywords } = require("./feedbackKeywords");

const MIN_ORDERS_FOR_DAILY = 1;
const MIN_FEEDBACK_FOR_TREND = 3;
const MIN_COMMENTS_FOR_KEYWORDS = 2;
const MIN_ORDERS_FOR_COOCCURRENCE = 2;
const DELAYED_PREP_THRESHOLD_MIN = 20;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function round2(n) {
  return Math.round((n || 0) * 100) / 100;
}

/**
 * Daily insight cards: busy hour, revenue vs yesterday, best/slow seller,
 * kitchen alert, feedback summary — everything the Copilot panel's front
 * row of cards needs in one query pass.
 */
async function getDailyInsights(restaurantId) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  const [todayOrders, yesterdayOrders, todayFeedback] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: todayStart }, status: { not: "CANCELLED" } },
      select: {
        id: true,
        createdAt: true,
        acceptedAt: true,
        servedAt: true,
        status: true,
        items: { select: { menuItemId: true, quantity: true, price: true, menuItem: { select: { name: true } } } },
      },
    }),
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: yesterdayStart, lt: todayStart }, status: { not: "CANCELLED" } },
      select: { items: { select: { quantity: true, price: true } } },
    }),
    prisma.feedback.findMany({
      where: { restaurantId, createdAt: { gte: todayStart } },
      select: { rating: true, comment: true },
    }),
  ]);

  const revenueOf = (orders) => orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0);
  const todayRevenue = round2(revenueOf(todayOrders));
  const yesterdayRevenue = round2(revenueOf(yesterdayOrders));

  // Busy hour today
  let busyHour = null;
  if (todayOrders.length >= MIN_ORDERS_FOR_DAILY) {
    const hourCounts = new Array(24).fill(0);
    todayOrders.forEach((o) => hourCounts[new Date(o.createdAt).getHours()]++);
    const maxCount = Math.max(...hourCounts);
    const peakHour = hourCounts.indexOf(maxCount);
    busyHour = {
      hasData: true,
      hour: peakHour,
      count: maxCount,
      label: `${formatHour(peakHour)}–${formatHour((peakHour + 1) % 24)}`,
      text: `Most orders today arrived between ${formatHour(peakHour)}–${formatHour((peakHour + 1) % 24)}.`,
    };
  }

  // Revenue vs yesterday
  const revenueChangePercent = yesterdayRevenue > 0 ? round2(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : null;
  const revenueComparison = {
    hasData: todayOrders.length >= MIN_ORDERS_FOR_DAILY || yesterdayOrders.length > 0,
    today: todayRevenue,
    yesterday: yesterdayRevenue,
    changePercent: revenueChangePercent,
    text:
      yesterdayRevenue === 0
        ? todayRevenue > 0
          ? `Today's revenue is ₹${todayRevenue.toLocaleString("en-IN")} — no orders were recorded yesterday to compare against.`
          : "Not enough data yet."
        : `Revenue is ${revenueChangePercent >= 0 ? "up" : "down"} ${Math.abs(revenueChangePercent)}% versus yesterday (₹${todayRevenue.toLocaleString("en-IN")} vs ₹${yesterdayRevenue.toLocaleString("en-IN")}).`,
  };

  // Best / slow seller today
  const itemMap = new Map();
  todayOrders.forEach((o) =>
    o.items.forEach((i) => {
      const key = i.menuItemId;
      const cur = itemMap.get(key) || { name: i.menuItem?.name || "Item", quantity: 0, revenue: 0 };
      cur.quantity += i.quantity;
      cur.revenue += i.price * i.quantity;
      itemMap.set(key, cur);
    })
  );
  const itemsToday = Array.from(itemMap.values()).map((i) => ({ ...i, revenue: round2(i.revenue) }));
  const bestSellerToday =
    itemsToday.length > 0
      ? (() => {
          const best = [...itemsToday].sort((a, b) => b.revenue - a.revenue)[0];
          return { hasData: true, ...best, text: `${best.name} generated the highest revenue today (₹${best.revenue.toLocaleString("en-IN")}).` };
        })()
      : { hasData: false, text: "Not enough data yet." };
  const slowSellerToday =
    itemsToday.length > 1
      ? (() => {
          const slow = [...itemsToday].sort((a, b) => a.revenue - b.revenue)[0];
          return { hasData: true, ...slow, text: `${slow.name} was today's slowest seller (${slow.quantity} sold).` };
        })()
      : { hasData: false, text: "Not enough data yet." };

  // Kitchen alert — orders sitting in ACCEPTED/PREPARING past the delay threshold right now.
  const delayedNow = todayOrders.filter((o) => {
    if (!["ACCEPTED", "PREPARING"].includes(o.status) || !o.acceptedAt) return false;
    return (now.getTime() - new Date(o.acceptedAt).getTime()) / 60000 > DELAYED_PREP_THRESHOLD_MIN;
  });
  const kitchenAlert = {
    hasData: true,
    delayedCount: delayedNow.length,
    text:
      delayedNow.length === 0
        ? "Kitchen is on pace — no orders are currently running late."
        : `${delayedNow.length} order${delayedNow.length === 1 ? " is" : "s are"} currently taking longer than ${DELAYED_PREP_THRESHOLD_MIN} minutes to prepare.`,
  };

  // Feedback summary today
  const feedbackSummary =
    todayFeedback.length > 0
      ? (() => {
          const avg = round2(todayFeedback.reduce((s, f) => s + f.rating, 0) / todayFeedback.length);
          return { hasData: true, averageRating: avg, count: todayFeedback.length, text: `Average rating today is ${avg}/5 across ${todayFeedback.length} review${todayFeedback.length === 1 ? "" : "s"}.` };
        })()
      : { hasData: false, text: "Not enough data yet." };

  return {
    generatedAt: now.toISOString(),
    busyHour: busyHour || { hasData: false, text: "Not enough data yet." },
    revenueComparison,
    bestSellerToday,
    slowSellerToday,
    kitchenAlert,
    feedbackSummary,
  };
}

function formatHour(h) {
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${period}`;
}

/**
 * Menu intelligence: frequently-ordered-together pairs, popular categories,
 * underperforming items, high-revenue items — all derived from real
 * OrderItem rows (30-day lookback, matching the existing analytics window).
 */
async function getMenuIntelligence(restaurantId) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: { restaurantId, createdAt: { gte: since }, status: { not: "CANCELLED" } },
    select: {
      id: true,
      items: { select: { menuItemId: true, quantity: true, price: true, menuItem: { select: { name: true, category: { select: { name: true } }, isAvailable: true } } } },
    },
  });

  const itemStats = new Map();
  const categoryStats = new Map();
  const pairCounts = new Map();

  orders.forEach((order) => {
    const uniqueItemIds = Array.from(new Set(order.items.map((i) => i.menuItemId)));

    order.items.forEach((i) => {
      const stat = itemStats.get(i.menuItemId) || { name: i.menuItem?.name || "Item", quantity: 0, revenue: 0, isAvailable: i.menuItem?.isAvailable !== false };
      stat.quantity += i.quantity;
      stat.revenue += i.price * i.quantity;
      itemStats.set(i.menuItemId, stat);

      const catName = i.menuItem?.category?.name || "Uncategorized";
      categoryStats.set(catName, (categoryStats.get(catName) || 0) + i.quantity);
    });

    // Co-occurrence — every unordered pair of distinct items in the same order.
    if (uniqueItemIds.length >= MIN_ORDERS_FOR_COOCCURRENCE) {
      for (let a = 0; a < uniqueItemIds.length; a++) {
        for (let b = a + 1; b < uniqueItemIds.length; b++) {
          const key = [uniqueItemIds[a], uniqueItemIds[b]].sort().join("::");
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        }
      }
    }
  });

  const items = Array.from(itemStats.entries()).map(([id, s]) => ({ id, ...s, revenue: round2(s.revenue) }));

  const highRevenueItems = [...items].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const underperformingItems = items
    .filter((i) => i.isAvailable)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  const popularCategories = Array.from(categoryStats.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity);

  const frequentlyOrderedTogether = Array.from(pairCounts.entries())
    .filter(([, count]) => count >= MIN_ORDERS_FOR_COOCCURRENCE)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const [idA, idB] = key.split("::");
      return {
        itemA: itemStats.get(idA)?.name || "Item",
        itemB: itemStats.get(idB)?.name || "Item",
        count,
      };
    });

  return {
    hasData: orders.length > 0,
    windowDays: 30,
    highRevenueItems,
    underperformingItems: items.length > 0 ? underperformingItems : [],
    popularCategories,
    frequentlyOrderedTogether,
  };
}

/**
 * Customer feedback insights — rating trend (last 14 days, daily average),
 * plus keyword-grouped compliments/complaints from free-text comments
 * (Phase 10's new optional Feedback.comment field). Historical rows with no
 * comment simply don't contribute text — never fabricated.
 */
async function getFeedbackInsights(restaurantId) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const feedbacks = await prisma.feedback.findMany({
    where: { restaurantId, createdAt: { gte: since } },
    select: { rating: true, comment: true, createdAt: true, menuItem: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (feedbacks.length === 0) {
    return { hasData: false, text: "Not enough data yet." };
  }

  // Daily average rating trend
  const byDay = new Map();
  feedbacks.forEach((f) => {
    const key = startOfDay(f.createdAt).getTime();
    const cur = byDay.get(key) || { sum: 0, count: 0 };
    cur.sum += f.rating;
    cur.count += 1;
    byDay.set(key, cur);
  });
  const ratingTrend = Array.from(byDay.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([key, v]) => ({ date: new Date(key).toISOString(), averageRating: round2(v.sum / v.count), count: v.count }));

  const overallAverage = round2(feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length);
  const firstHalfAvg = ratingTrend.slice(0, Math.ceil(ratingTrend.length / 2)).reduce((s, d) => s + d.averageRating, 0) / Math.max(1, Math.ceil(ratingTrend.length / 2));
  const secondHalfAvg = ratingTrend.slice(Math.ceil(ratingTrend.length / 2)).reduce((s, d, _, arr) => s + d.averageRating / arr.length, 0) || firstHalfAvg;
  const trendDirection = feedbacks.length >= MIN_FEEDBACK_FOR_TREND ? (secondHalfAvg > firstHalfAvg ? "UP" : secondHalfAvg < firstHalfAvg ? "DOWN" : "FLAT") : "UNKNOWN";

  // Keyword-based compliments/complaints from real comments only.
  const withComments = feedbacks.filter((f) => f.comment);
  const positiveComments = [];
  const negativeComments = [];
  withComments.forEach((f) => {
    const { label } = classifyComment(f.comment);
    if (label === "POSITIVE") positiveComments.push(f.comment);
    else if (label === "NEGATIVE") negativeComments.push(f.comment);
  });

  const hasEnoughComments = withComments.length >= MIN_COMMENTS_FOR_KEYWORDS;

  // Review highlights — most positive and most critical single comments (by rating).
  const highlights = withComments
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 1)
    .concat(withComments.slice().sort((a, b) => a.rating - b.rating).slice(0, 1))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map((f) => ({ rating: f.rating, comment: f.comment, item: f.menuItem?.name || null }));

  return {
    hasData: true,
    overallAverage,
    trendDirection,
    ratingTrend,
    commentsAnalyzed: withComments.length,
    compliments: hasEnoughComments ? topKeywords(positiveComments) : [],
    complaints: hasEnoughComments ? topKeywords(negativeComments) : [],
    commentsNote: hasEnoughComments ? null : "Not enough written reviews yet to summarize common themes — star ratings only.",
    highlights,
  };
}

/**
 * Kitchen performance — average/longest prep time from Order.servedAt
 * (Phase 10's new field), plus currently-delayed orders and busy hours.
 * Orders placed before this field existed are simply excluded, not guessed at.
 */
async function getKitchenPerformance(restaurantId) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // "Currently delayed" must mean operationally current — bounded to the
  // last 24h, so an order abandoned in ACCEPTED/PREPARING weeks ago (stale
  // test data, an uncleaned session, etc.) never gets reported as a live
  // kitchen problem happening right now.
  const recentWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [servedOrders, activeOrders] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: since }, servedAt: { not: null }, status: { not: "CANCELLED" } },
      select: { createdAt: true, servedAt: true, orderNumber: true },
    }),
    prisma.order.findMany({
      where: { restaurantId, status: { in: ["ACCEPTED", "PREPARING"] }, createdAt: { gte: recentWindow } },
      select: { id: true, orderNumber: true, acceptedAt: true, createdAt: true, session: { select: { table: { select: { code: true } } } } },
    }),
  ]);

  const now = new Date();
  const delayedOrders = activeOrders
    .filter((o) => o.acceptedAt && (now.getTime() - new Date(o.acceptedAt).getTime()) / 60000 > DELAYED_PREP_THRESHOLD_MIN)
    .map((o) => ({
      orderNumber: o.orderNumber,
      tableCode: o.session?.table?.code || null,
      minutesElapsed: Math.round((now.getTime() - new Date(o.acceptedAt).getTime()) / 60000),
    }));

  if (servedOrders.length === 0) {
    return {
      hasData: false,
      text: "Not enough data yet.",
      delayedOrders,
      delayedCount: delayedOrders.length,
    };
  }

  const prepMinutes = servedOrders.map((o) => (new Date(o.servedAt).getTime() - new Date(o.createdAt).getTime()) / 60000);
  const averagePrepMinutes = Math.round((prepMinutes.reduce((a, b) => a + b, 0) / prepMinutes.length) * 10) / 10;
  const longest = servedOrders.reduce((max, o, idx) => (prepMinutes[idx] > (max?.minutes ?? -1) ? { orderNumber: o.orderNumber, minutes: Math.round(prepMinutes[idx]) } : max), null);

  // Busy kitchen periods — hour-of-day density of orders that were actually served.
  const hourCounts = new Array(24).fill(0);
  servedOrders.forEach((o) => hourCounts[new Date(o.createdAt).getHours()]++);
  const busiestHour = hourCounts.indexOf(Math.max(...hourCounts));

  return {
    hasData: true,
    windowDays: 7,
    sampleSize: servedOrders.length,
    averagePrepMinutes,
    longestPrep: longest,
    delayedCount: delayedOrders.length,
    delayedOrders,
    busiestHour: { hour: busiestHour, label: formatHour(busiestHour) },
  };
}

/**
 * Table utilization summary for the Copilot panel — most-used table,
 * average dining duration, and peak occupancy hour. A focused subset of
 * what the existing Table Analytics page computes in full detail; kept
 * separate on purpose so this addition never touches that already-tested
 * endpoint.
 */
async function getTableUtilization(restaurantId) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessions = await prisma.session.findMany({
    where: { restaurantId, createdAt: { gte: since } },
    select: { createdAt: true, closedAt: true, table: { select: { code: true, number: true } } },
  });

  if (sessions.length === 0) {
    return { hasData: false, text: "Not enough data yet." };
  }

  const tableCounts = new Map();
  const hourCounts = new Array(24).fill(0);
  let totalStayMs = 0;
  let closedCount = 0;

  sessions.forEach((s) => {
    const code = s.table?.code || "Unknown";
    tableCounts.set(code, (tableCounts.get(code) || 0) + 1);
    hourCounts[new Date(s.createdAt).getHours()]++;
    if (s.closedAt) {
      totalStayMs += new Date(s.closedAt).getTime() - new Date(s.createdAt).getTime();
      closedCount++;
    }
  });

  const [mostUsedTable, mostUsedCount] = Array.from(tableCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const averageDiningMinutes = closedCount > 0 ? Math.round(totalStayMs / closedCount / 60000) : null;

  return {
    hasData: true,
    windowDays: 7,
    mostUsedTable: { code: mostUsedTable, sessions: mostUsedCount },
    averageDiningMinutes,
    peakOccupancy: { hour: peakHour, label: formatHour(peakHour) },
    text: `Table ${mostUsedTable} completed the most sessions this week (${mostUsedCount}).`,
  };
}

const REVENUE_MILESTONES = [5000, 10000, 25000, 50000, 100000, 200000];

/**
 * A same-day timeline of notable, derived-from-real-events moments: when
 * the busiest hour changed hands, when cumulative revenue crossed a round
 * milestone, and any menu item that received its first-ever order today.
 * Nothing is stored for this — it's recomputed by replaying today's orders
 * in chronological order.
 */
async function getInsightTimeline(restaurantId) {
  const todayStart = startOfDay(new Date());

  const [todayOrders, priorItemCounts] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: todayStart }, status: { not: "CANCELLED" } },
      select: { createdAt: true, items: { select: { menuItemId: true, quantity: true, price: true, menuItem: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: { order: { restaurantId, createdAt: { lt: todayStart }, status: { not: "CANCELLED" } } },
      _count: { _all: true },
    }),
  ]);

  if (todayOrders.length === 0) {
    return { hasData: false, text: "Not enough data yet.", events: [] };
  }

  const everOrderedBefore = new Set(priorItemCounts.map((r) => r.menuItemId));
  const firstOrderSeenToday = new Set();

  const hourCounts = new Array(24).fill(0);
  let runningRevenue = 0;
  let currentBusiestHour = -1;
  let currentBusiestCount = 0;
  let nextMilestoneIdx = 0;
  const events = [];

  todayOrders.forEach((order) => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour]++;
    if (hourCounts[hour] > currentBusiestCount) {
      currentBusiestCount = hourCounts[hour];
      if (hour !== currentBusiestHour) {
        currentBusiestHour = hour;
        events.push({ time: order.createdAt, type: "BUSY_HOUR", text: `${formatHour(hour)} became today's busiest hour.` });
      }
    }

    order.items.forEach((item) => {
      runningRevenue += item.price * item.quantity;
      if (!everOrderedBefore.has(item.menuItemId) && !firstOrderSeenToday.has(item.menuItemId)) {
        firstOrderSeenToday.add(item.menuItemId);
        events.push({ time: order.createdAt, type: "NEW_ITEM", text: `"${item.menuItem?.name || "A new item"}" received its first-ever order.` });
      }
    });

    while (nextMilestoneIdx < REVENUE_MILESTONES.length && runningRevenue >= REVENUE_MILESTONES[nextMilestoneIdx]) {
      events.push({ time: order.createdAt, type: "REVENUE_MILESTONE", text: `Revenue crossed ₹${REVENUE_MILESTONES[nextMilestoneIdx].toLocaleString("en-IN")}.` });
      nextMilestoneIdx++;
    }
  });

  return { hasData: true, events: events.sort((a, b) => new Date(b.time) - new Date(a.time)) };
}

module.exports = {
  getDailyInsights,
  getMenuIntelligence,
  getFeedbackInsights,
  getKitchenPerformance,
  getTableUtilization,
  getInsightTimeline,
  formatHour,
  DELAYED_PREP_THRESHOLD_MIN,
};
