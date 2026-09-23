const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const DEMO_SLUG = "nookambika";
let cachedDemoRestaurantId = null;

async function getDemoRestaurantId() {
  if (cachedDemoRestaurantId) return cachedDemoRestaurantId;
  const demo = await prisma.restaurant.findUnique({ where: { slug: DEMO_SLUG }, select: { id: true } });
  if (!demo) throw new Error("Default demo restaurant is not configured.");
  cachedDemoRestaurantId = demo.id;
  return cachedDemoRestaurantId;
}

/**
 * For authenticated STAFF routes (after `authenticate`).
 * Restaurant-scoped users (restaurantId set on their account) are hard-locked
 * to that restaurant — any client-supplied restaurant hint is ignored, which
 * is the actual tenant-isolation boundary.
 * Platform Owners (restaurantId === null on their account) may optionally
 * target one restaurant via the `X-Restaurant-Id` header or `?restaurantId=`
 * query param; omitting it means "platform-wide" (req.restaurantId stays null).
 */
const resolveStaffTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  if (req.user.restaurantId) {
    req.restaurantId = req.user.restaurantId;
    req.isPlatformOwner = false;
  } else {
    req.isPlatformOwner = true;
    const requested = req.headers["x-restaurant-id"] || req.query.restaurantId || null;
    req.restaurantId = requested || null;
  }

  next();
};

/**
 * For PUBLIC customer-facing routes. Resolves the restaurant from:
 *   1. `req.params.slug`       (new routes: /api/restaurants/:slug/...)
 *   2. `req.body.restaurantSlug` / `req.query.restaurantSlug` (e.g. POST /sessions)
 *   3. Falls back to the demo restaurant when none is present — this is what
 *      keeps every pre-existing (un-prefixed) route and physical QR code
 *      working exactly as before, unchanged.
 */
const resolvePublicTenant = async (req, res, next) => {
  try {
    const slug = req.params.slug || req.body?.restaurantSlug || req.query?.restaurantSlug;

    if (slug) {
      const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
      if (!restaurant || !restaurant.isActive) {
        return res.status(404).json({ success: false, message: "Restaurant not found." });
      }
      req.restaurantId = restaurant.id;
      req.restaurant = restaurant;
      return next();
    }

    req.restaurantId = await getDemoRestaurantId();
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * For routes used by BOTH anonymous customers AND authenticated staff on the
 * exact same path (e.g. GET /menu, GET /categories — the customer menu page
 * and the admin menu-management page both call these). A logged-in staff
 * member's own restaurant always wins here — this is the actual fix for a
 * subtle isolation bug: without it, a staff request with no slug in the URL
 * would silently fall back to the demo restaurant's data instead of their own.
 */
const resolveTenant = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET || "nookambika-dhaba-jwt-secret-2024-secure";
        const decoded = jwt.verify(token, secret);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, restaurantId: true },
        });

        if (user?.restaurantId) {
          req.restaurantId = user.restaurantId;
          req.isPlatformOwner = false;
          req.user = user;
          return next();
        }

        if (user && !user.restaurantId) {
          // Platform Owner — only trust an explicit target, never a bare fallback.
          const requested = req.headers["x-restaurant-id"] || req.query.restaurantId;
          if (requested) {
            req.restaurantId = requested;
            req.isPlatformOwner = true;
            req.user = user;
            return next();
          }
          req.user = user;
          req.isPlatformOwner = true;
          // fall through to public resolution below
        }
      } catch (e) {
        // Invalid/expired token on a route that doesn't strictly require auth —
        // treat as anonymous rather than failing the request.
      }
    }

    return resolvePublicTenant(req, res, next);
  } catch (error) {
    next(error);
  }
};

module.exports = { resolveStaffTenant, resolvePublicTenant, resolveTenant, getDemoRestaurantId };
