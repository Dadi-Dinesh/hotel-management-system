const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");

/**
 * Login — Captain or Admin
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    let restaurant = null;
    if (user.restaurantId) {
      restaurant = await prisma.restaurant.findUnique({
        where: { id: user.restaurantId },
        select: { id: true, name: true, slug: true, shortName: true, logo: true, primaryColor: true, secondaryColor: true, isActive: true },
      });

      // A disabled tenant (Platform Owner toggle) must not let its staff operate —
      // Platform Owner accounts (restaurantId null) are never subject to this.
      if (!restaurant || !restaurant.isActive) {
        return res.status(403).json({
          success: false,
          message: "This restaurant account is suspended. Please contact ServeSync support.",
        });
      }
      delete restaurant.isActive;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, restaurantId: user.restaurantId },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
          isPlatformOwner: !user.restaurantId,
        },
        restaurant,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user info
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe };
