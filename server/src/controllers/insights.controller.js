const prisma = require("../config/db");
const insightCache = require("../services/insights/insightCache");
const { getDailyInsights, getMenuIntelligence, getFeedbackInsights, getKitchenPerformance, getTableUtilization, getInsightTimeline } = require("../services/insights/insightEngine");
const { getTrendComparison } = require("../services/insights/trendAnalyzer");
const { getRecommendations } = require("../services/insights/recommendationEngine");
const { askQuestion } = require("../services/insights/askAI");
const { generateReport } = require("../services/insights/reportGenerator");

const OVERVIEW_TTL_MS = 45000;

/**
 * Everything the AI Copilot panel needs for its first paint, in one
 * response — daily insight cards, menu intelligence, feedback insights,
 * kitchen performance, table utilization, recommendations, and today's
 * timeline. Cached briefly per restaurant so a burst of dashboard
 * loads/socket-triggered refreshes doesn't re-scan order history every time.
 * GET /api/admin/insights/overview
 */
const getOverview = async (req, res, next) => {
  try {
    if (!req.restaurantId) {
      return res.json({ success: true, data: null, message: "Select a restaurant to see AI Copilot insights." });
    }

    const cacheKey = `${req.restaurantId}:overview`;
    const cached = insightCache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const [daily, menu, feedback, kitchen, tables, recommendations, timeline] = await Promise.all([
      getDailyInsights(req.restaurantId),
      getMenuIntelligence(req.restaurantId),
      getFeedbackInsights(req.restaurantId),
      getKitchenPerformance(req.restaurantId),
      getTableUtilization(req.restaurantId),
      getRecommendations(req.restaurantId),
      getInsightTimeline(req.restaurantId),
    ]);

    const data = { daily, menu, feedback, kitchen, tables, recommendations, timeline, generatedAt: new Date().toISOString() };
    insightCache.set(cacheKey, data, OVERVIEW_TTL_MS);

    res.json({ success: true, data, cached: false });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/insights/trends?compare=today-yesterday|week-week|month-month
 */
const getTrends = async (req, res, next) => {
  try {
    if (!req.restaurantId) {
      return res.json({ success: true, data: null });
    }
    const compare = req.query.compare || "today-yesterday";
    const cacheKey = `${req.restaurantId}:trend:${compare}`;
    const cached = insightCache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const data = await getTrendComparison(req.restaurantId, compare);
    insightCache.set(cacheKey, data, OVERVIEW_TTL_MS);
    res.json({ success: true, data, cached: false });
  } catch (error) {
    next(error);
  }
};

/**
 * Ask AI — Admin-only natural-language question over this restaurant's own
 * data. Never calls an external AI service; see services/insights/askAI.js.
 * POST /api/admin/insights/ask  { question }
 */
const postAsk = async (req, res, next) => {
  try {
    if (!req.restaurantId) {
      return res.status(400).json({ success: false, message: "Select a restaurant before asking a question." });
    }
    const { question } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ success: false, message: "A question string is required." });
    }
    const result = await askQuestion(req.restaurantId, question);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/insights/report?period=daily|weekly|monthly
 */
const getReport = async (req, res, next) => {
  try {
    if (!req.restaurantId) {
      return res.json({ success: true, data: null });
    }
    const period = ["daily", "weekly", "monthly"].includes(req.query.period) ? req.query.period : "daily";
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.restaurantId }, select: { name: true } });
    const data = await generateReport(req.restaurantId, period, restaurant?.name);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOverview, getTrends, postAsk, getReport };
