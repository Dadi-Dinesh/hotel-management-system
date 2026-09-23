/**
 * askAI — a natural-language question answerer for the Admin-only "Ask AI"
 * box. This is NOT a call to an external LLM: there's no AI API key
 * anywhere in this project, and the brief is explicit that answers must
 * never be fabricated and must come from "the restaurant's database." So
 * this is a small intent-matcher: it recognizes common phrasings, runs the
 * matching real Prisma query, and returns a plain-language answer built
 * from the actual result. Anything it doesn't recognize gets an honest
 * "I couldn't find a way to answer that" — never a guess.
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

/** Looks for a date-range keyword in the question; defaults to "today". */
function parsePeriod(question) {
  const q = question.toLowerCase();
  const now = new Date();
  const todayStart = startOfDay(now);

  if (/\byesterday\b/.test(q)) {
    const start = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    return { start, end: todayStart, label: "yesterday" };
  }
  if (/\blast week\b/.test(q)) {
    const dow = now.getDay();
    const thisWeekStart = startOfDay(new Date(now.getTime() - dow * 24 * 60 * 60 * 1000));
    const start = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start, end: thisWeekStart, label: "last week" };
  }
  if (/\bthis week\b|\bweek\b/.test(q)) {
    const dow = now.getDay();
    const start = startOfDay(new Date(now.getTime() - dow * 24 * 60 * 60 * 1000));
    return { start, end: now, label: "this week" };
  }
  if (/\blast month\b/.test(q)) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end, label: "last month" };
  }
  if (/\bthis month\b|\bmonth\b/.test(q)) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now, label: "this month" };
  }
  if (/\ball time\b|\boverall\b|\bever\b/.test(q)) {
    return { start: new Date(0), end: now, label: "all time" };
  }
  return { start: todayStart, end: now, label: "today" };
}

/** Parses "after 8pm" / "after 8 am" / "since 20:00" into an hour (0-23), or null. */
function parseHourFilter(question) {
  const match = question.toLowerCase().match(/(?:after|since)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const period = match[3];
  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  return hour;
}

const INTENTS = [
  {
    name: "REVENUE",
    test: (q) => /revenue|sales|earn/i.test(q) && !/table/i.test(q),
    handler: async (restaurantId, question) => {
      const { start, end, label } = parsePeriod(question);
      const orders = await prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
        select: { items: { select: { price: true, quantity: true } } },
      });
      if (orders.length === 0) {
        return { answer: `No orders were recorded ${label}, so there's no revenue to report.`, data: { revenue: 0, orders: 0, period: label } };
      }
      const revenue = round2(orders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.price * i.quantity, 0), 0));
      return {
        answer: `Revenue ${label} is ₹${revenue.toLocaleString("en-IN")} from ${orders.length} order${orders.length === 1 ? "" : "s"}.`,
        data: { revenue, orders: orders.length, period: label },
      };
    },
  },
  {
    name: "TOP_ITEM",
    // Matches either word order ("most sold item" or "item sold the most") —
    // the brief's own example ("Which item sold the most") is the latter.
    test: (q) => /\b(item|seller|dish)\b/i.test(q) && /\b(top|best|most|highest|sold)\b/i.test(q) && !/table/i.test(q),
    handler: async (restaurantId, question) => {
      const { start, end, label } = parsePeriod(question);
      const items = await prisma.orderItem.findMany({
        where: { order: { restaurantId, createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } } },
        select: { quantity: true, price: true, menuItem: { select: { name: true } } },
      });
      if (items.length === 0) {
        return { answer: `No items were sold ${label}.`, data: { period: label } };
      }
      const map = new Map();
      items.forEach((i) => {
        const name = i.menuItem?.name || "Item";
        const cur = map.get(name) || { quantity: 0, revenue: 0 };
        cur.quantity += i.quantity;
        cur.revenue += i.price * i.quantity;
        map.set(name, cur);
      });
      const [name, stat] = Array.from(map.entries()).sort((a, b) => b[1].quantity - a[1].quantity)[0];
      return {
        answer: `"${name}" sold the most ${label}, with ${stat.quantity} unit${stat.quantity === 1 ? "" : "s"} sold (₹${round2(stat.revenue).toLocaleString("en-IN")} revenue).`,
        data: { name, quantity: stat.quantity, revenue: round2(stat.revenue), period: label },
      };
    },
  },
  {
    name: "TABLE_REVENUE",
    test: (q) => /table/i.test(q) && /(revenue|highest|most|top)/i.test(q),
    handler: async (restaurantId, question) => {
      const { start, end, label } = parsePeriod(question);
      const orders = await prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
        select: { items: { select: { price: true, quantity: true } }, session: { select: { table: { select: { code: true } } } } },
      });
      if (orders.length === 0) {
        return { answer: `No orders were recorded ${label}, so there's no per-table revenue to report.`, data: { period: label } };
      }
      const map = new Map();
      orders.forEach((o) => {
        const code = o.session?.table?.code || "Unknown";
        const revenue = o.items.reduce((s, i) => s + i.price * i.quantity, 0);
        map.set(code, (map.get(code) || 0) + revenue);
      });
      const [code, revenue] = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0];
      return {
        answer: `Table ${code} generated the highest revenue ${label}, at ₹${round2(revenue).toLocaleString("en-IN")}.`,
        data: { tableCode: code, revenue: round2(revenue), period: label },
      };
    },
  },
  {
    name: "ORDER_COUNT_AFTER_HOUR",
    test: (q) => /order/i.test(q) && /(after|since)\s+\d/i.test(q),
    handler: async (restaurantId, question) => {
      const hour = parseHourFilter(question);
      const { start, end, label } = parsePeriod(question);
      if (hour === null) return null; // fall through to ORDER_COUNT
      const orders = await prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
        select: { createdAt: true },
      });
      const count = orders.filter((o) => new Date(o.createdAt).getHours() >= hour).length;
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      const period = hour >= 12 ? "PM" : "AM";
      return {
        answer: `${count} order${count === 1 ? "" : "s"} came in after ${h12} ${period} ${label}.`,
        data: { count, afterHour: hour, period: label },
      };
    },
  },
  {
    name: "ORDER_COUNT",
    test: (q) => /how many orders|order count|number of orders/i.test(q),
    handler: async (restaurantId, question) => {
      const { start, end, label } = parsePeriod(question);
      const count = await prisma.order.count({ where: { restaurantId, createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } } });
      return { answer: `There were ${count} order${count === 1 ? "" : "s"} ${label}.`, data: { count, period: label } };
    },
  },
  {
    name: "AVERAGE_RATING",
    test: (q) => /(average|avg)[\s\w]*(rating|feedback|review)/i.test(q),
    handler: async (restaurantId, question) => {
      const { start, end, label } = parsePeriod(question);
      const feedbacks = await prisma.feedback.findMany({ where: { restaurantId, createdAt: { gte: start, lt: end } }, select: { rating: true } });
      if (feedbacks.length === 0) {
        return { answer: `No feedback was submitted ${label}.`, data: { period: label } };
      }
      const avg = round2(feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length);
      return { answer: `The average rating ${label} is ${avg}/5 from ${feedbacks.length} review${feedbacks.length === 1 ? "" : "s"}.`, data: { average: avg, count: feedbacks.length, period: label } };
    },
  },
];

/**
 * @param {string} restaurantId
 * @param {string} question
 * @returns {{ answer: string, matched: boolean, intent: string|null, data: any }}
 */
async function askQuestion(restaurantId, question) {
  const trimmed = String(question || "").trim();
  if (!trimmed) {
    return { answer: "Ask me something about your restaurant's orders, revenue, top items, or feedback.", matched: false, intent: null, data: null };
  }

  for (const intent of INTENTS) {
    if (intent.test(trimmed)) {
      // eslint-disable-next-line no-await-in-loop
      const result = await intent.handler(restaurantId, trimmed);
      if (result) {
        return { answer: result.answer, matched: true, intent: intent.name, data: result.data };
      }
    }
  }

  return {
    answer:
      "I couldn't find a way to answer that from your restaurant's data yet. Try asking about revenue, top-selling items, order counts, table performance, or average ratings — for today, this week, or this month.",
    matched: false,
    intent: null,
    data: null,
  };
}

module.exports = { askQuestion, parsePeriod, parseHourFilter };
