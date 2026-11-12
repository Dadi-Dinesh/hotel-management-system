const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const PUBLIC_RESTAURANT_FIELDS = {
  id: true,
  name: true,
  slug: true,
  shortName: true,
  logo: true,
  coverImage: true,
  cuisine: true,
  primaryColor: true,
  secondaryColor: true,
  accentColor: true,
  welcomeMessage: true,
  currency: true,
  address: true,
  phone: true,
  isActive: true,
};

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
  } else if (req.user.role === "ADMIN" && req.user.restaurantId === null) {
    req.isPlatformOwner = true;
    const requested = req.headers["x-restaurant-id"] || req.query.restaurantId || null;
    if (requested !== null && (typeof requested !== "string" || !requested.trim())) {
      return res.status(400).json({ success: false, message: "Invalid restaurant selection." });
    }
    if (!requested && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      return res.status(400).json({ success: false, message: "Select a restaurant before making changes." });
    }
    req.restaurantId = requested;
  } else {
    return res.status(403).json({ success: false, message: "Restaurant access required." });
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
    const slug = req.params.slug ?? req.body?.restaurantSlug ?? req.query?.restaurantSlug ?? DEMO_SLUG;

    if (typeof slug !== "string" || !slug.trim()) return res.status(404).json({ success: false, message: "Restaurant not found." });
    const restaurant = await prisma.restaurant.findUnique({ where: { slug }, select: PUBLIC_RESTAURANT_FIELDS });
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }
    req.restaurantId = restaurant.id;
    req.restaurant = restaurant;
    return next();
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
        const secret = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, role: true, restaurantId: true, restaurant: { select: { isActive: true } } },
        });

        if (user?.restaurantId && user.restaurant?.isActive) {
          req.restaurantId = user.restaurantId;
          req.isPlatformOwner = false;
          req.user = user;
          return next();
        }

        if (user?.role === "ADMIN" && user.restaurantId === null) {
          // Platform Owner — only trust an explicit target, never a bare fallback.
          // In particular: do NOT fall through to resolvePublicTenant below —
          // its demo-restaurant default exists for genuinely anonymous QR
          // traffic, and previously leaked Nookambika's menu/categories to any
          // authenticated Platform Owner who simply hadn't picked a restaurant
          // via the switcher yet. "Platform-wide" must mean no restaurant, not
          // a silent default to the demo tenant.
          const requested = req.headers["x-restaurant-id"] || req.query.restaurantId;
          req.user = user;
          req.isPlatformOwner = true;
          req.restaurantId = requested || null;
          return next();
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

module.exports = { resolveStaffTenant, resolvePublicTenant, resolveTenant, getDemoRestaurantId, PUBLIC_RESTAURANT_FIELDS };
