const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

/**
 * Verify JWT token from Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "nookambika-dhaba-jwt-secret-2024-secure";
    const decoded = jwt.verify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, restaurantId: true, restaurant: { select: { isActive: true } } },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found.",
      });
    }

    // A suspended tenant's staff lose access immediately, not just at next
    // login. Platform Owners (restaurantId null) are never affected.
    if (user.restaurantId && user.restaurant && !user.restaurant.isActive) {
      return res.status(403).json({
        success: false,
        message: "This restaurant account is suspended. Please contact ServeSync support.",
      });
    }

    const { restaurant, ...userFields } = user;
    req.user = userFields;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

/**
 * Role-based access control middleware
 * Usage: requireRole("ADMIN") or requireRole("ADMIN", "CAPTAIN")
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

/**
 * Platform-only routes (application review/approval). A Platform Owner is
 * any User with restaurantId === null — role alone can't distinguish one
 * from a normal restaurant ADMIN, since both carry role "ADMIN". Self-
 * contained (only needs `authenticate` to have run first): application
 * management isn't restaurant-scoped, so resolveStaffTenant isn't needed.
 */
const requirePlatformOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  if (req.user.restaurantId) {
    return res.status(403).json({ success: false, message: "Platform Owner access required." });
  }
  next();
};

module.exports = { authenticate, requireRole, requirePlatformOwner };
