const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { uploadToCloudinary, deleteFromCloudinary } = require("../middleware/upload");
const { logAudit } = require("../utils/auditLog");
const { sendEmail } = require("../services/email/emailService");
const { welcomeEmail, restaurantCreatedEmail } = require("../services/email/templates");
const { provisionRestaurant } = require("../services/restaurantProvisioning");

const PUBLIC_FIELDS = {
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

/**
 * Public restaurant profile — powers the new /restaurant/:slug pages' branding.
 * GET /api/restaurants/:slug
 */
const getRestaurantBySlug = async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: req.params.slug },
      select: PUBLIC_FIELDS,
    });
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }
    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

/**
 * List every restaurant — Platform Owner only, powers the RestaurantSwitcher.
 * GET /api/restaurants
 */
const listRestaurants = async (req, res, next) => {
  try {
    if (!req.isPlatformOwner) {
      return res.status(403).json({ success: false, message: "Platform Owner access required." });
    }
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      select: { ...PUBLIC_FIELDS, plan: true, subscriptionStatus: true, trialEndsAt: true, createdAt: true },
    });
    res.json({ success: true, data: restaurants });
  } catch (error) {
    next(error);
  }
};

/**
 * Onboarding — creates a brand-new Restaurant + its first Admin user + N tables,
 * and logs them straight in. Public (no auth — there's no user yet).
 * POST /api/restaurants
 */
const createRestaurant = async (req, res, next) => {
  try {
    const {
      name,
      cuisine,
      phone,
      address,
      primaryColor,
      tableCount,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    if (!name || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name, and admin name/email/password are required.",
      });
    }

    if (String(adminPassword).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    let logoUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, "servesync-restaurants");
      logoUrl = uploadResult.secure_url;
    }

    // The demo restaurant deliberately stays in legacy/open QR mode (no
    // token) — provisionRestaurant always issues real per-table tokens,
    // which is what every restaurant created after Phase 7 (via this
    // endpoint or the newer application-approval flow) gets by default.
    const result = await provisionRestaurant({
      name,
      cuisine,
      phone,
      address,
      logoUrl,
      primaryColor,
      tableCount,
      adminName,
      adminEmail,
      adminPassword,
    });

    const token = jwt.sign(
      { userId: result.admin.id, role: result.admin.role, restaurantId: result.restaurant.id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: `${result.restaurant.name} is ready!`,
      data: {
        token,
        user: {
          id: result.admin.id,
          name: result.admin.name,
          email: result.admin.email,
          role: result.admin.role,
          restaurantId: result.restaurant.id,
          isPlatformOwner: false,
        },
        restaurant: result.restaurant,
        // Strip the hash before it ever leaves the server — only the raw,
        // one-time token (needed to render the onboarding QR previews) goes out.
        tables: result.tables.map(({ qrTokenHash, ...t }) => t),
      },
    });

    logAudit({ action: "restaurant.created", restaurantId: result.restaurant.id, metadata: { name: result.restaurant.name, tableCount: result.tables.length } });

    // Fire-and-forget — no email provider is wired up yet (Phase 11 scope),
    // so sendEmail() only logs today. Never blocks or fails the response.
    const welcome = welcomeEmail({ adminName, restaurantName: result.restaurant.name });
    sendEmail({ to: adminEmail, subject: welcome.subject, html: welcome.html }).catch(() => {});
    const created = restaurantCreatedEmail({ adminName, restaurantName: result.restaurant.name, slug: result.restaurant.slug, tableCount: result.tables.length });
    sendEmail({ to: adminEmail, subject: created.subject, html: created.html }).catch(() => {});
  } catch (error) {
    next(error);
  }
};

/**
 * Full restaurant record (including tax/service-charge/timezone/email) — for
 * the Settings page. Admin of that restaurant (or Platform Owner) only.
 * GET /api/restaurants/:slug/settings
 */
const getRestaurantSettings = async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { slug: req.params.slug } });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }
    if (req.restaurantId && restaurant.id !== req.restaurantId) {
      return res.status(403).json({ success: false, message: "You can only view your own restaurant's settings." });
    }
    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

/**
 * Update restaurant settings — Admin of that restaurant only.
 * PATCH /api/restaurants/:slug/settings
 */
const updateRestaurantSettings = async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { slug: req.params.slug } });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }
    if (req.restaurantId && restaurant.id !== req.restaurantId) {
      return res.status(403).json({ success: false, message: "You can only edit your own restaurant." });
    }

    const {
      name,
      shortName,
      cuisine,
      phone,
      email,
      address,
      primaryColor,
      secondaryColor,
      accentColor,
      receiptFooter,
      welcomeMessage,
      currency,
      timeZone,
      taxPercent,
      serviceChargePercent,
      billingEmail,
      removeLogo,
      removeCoverImage,
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (shortName !== undefined) data.shortName = shortName || null;
    if (cuisine !== undefined) data.cuisine = cuisine || null;
    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;
    if (address !== undefined) data.address = address || null;
    if (primaryColor !== undefined) data.primaryColor = primaryColor;
    if (secondaryColor !== undefined) data.secondaryColor = secondaryColor;
    if (accentColor !== undefined) data.accentColor = accentColor;
    if (receiptFooter !== undefined) data.receiptFooter = receiptFooter || null;
    if (welcomeMessage !== undefined) data.welcomeMessage = welcomeMessage || null;
    if (currency !== undefined) data.currency = currency;
    if (timeZone !== undefined) data.timeZone = timeZone;
    if (billingEmail !== undefined) data.billingEmail = billingEmail || null;
    if (taxPercent !== undefined) data.taxPercent = parseFloat(taxPercent) || 0;
    if (serviceChargePercent !== undefined) data.serviceChargePercent = parseFloat(serviceChargePercent) || 0;

    // Logo / cover image uploads (field name distinguishes which one, via req.files from upload.fields)
    const logoFile = req.files?.logo?.[0];
    const coverFile = req.files?.coverImage?.[0];

    if (logoFile) {
      if (restaurant.logo) await deleteFromCloudinary(restaurant.logo);
      const uploadResult = await uploadToCloudinary(logoFile.buffer, "servesync-restaurants");
      data.logo = uploadResult.secure_url;
    } else if (removeLogo === "true" || removeLogo === true) {
      if (restaurant.logo) await deleteFromCloudinary(restaurant.logo);
      data.logo = null;
    }

    if (coverFile) {
      if (restaurant.coverImage) await deleteFromCloudinary(restaurant.coverImage);
      const uploadResult = await uploadToCloudinary(coverFile.buffer, "servesync-restaurants");
      data.coverImage = uploadResult.secure_url;
    } else if (removeCoverImage === "true" || removeCoverImage === true) {
      if (restaurant.coverImage) await deleteFromCloudinary(restaurant.coverImage);
      data.coverImage = null;
    }

    const updated = await prisma.restaurant.update({ where: { id: restaurant.id }, data });

    logAudit({ action: "restaurant.settings_updated", restaurantId: restaurant.id, userId: req.user?.id, metadata: { fields: Object.keys(data) } });

    res.json({ success: true, message: "Settings updated.", data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Danger Zone — disable (or re-enable) a restaurant. Never deletes data;
 * a disabled restaurant's rows all remain exactly as they were, it just
 * stops resolving on public routes and its staff can no longer log new
 * activity through it.
 * PATCH /api/restaurants/:slug/status
 */
const setRestaurantActive = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive (boolean) is required." });
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { slug: req.params.slug } });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }
    if (req.restaurantId && restaurant.id !== req.restaurantId) {
      return res.status(403).json({ success: false, message: "You can only manage your own restaurant." });
    }

    const updated = await prisma.restaurant.update({ where: { id: restaurant.id }, data: { isActive } });

    logAudit({ action: isActive ? "restaurant.enabled" : "restaurant.disabled", restaurantId: restaurant.id, userId: req.user?.id });

    res.json({ success: true, message: isActive ? "Restaurant re-enabled." : "Restaurant disabled.", data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRestaurantBySlug,
  getRestaurantSettings,
  listRestaurants,
  createRestaurant,
  updateRestaurantSettings,
  setRestaurantActive,
};
