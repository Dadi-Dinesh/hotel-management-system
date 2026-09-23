const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { uploadToCloudinary, deleteFromCloudinary } = require("../middleware/upload");
const { generateRawToken, hashToken } = require("../utils/tokenUtils");
const { logAudit } = require("../utils/auditLog");
const { sendEmail } = require("../services/email/emailService");
const { welcomeEmail, restaurantCreatedEmail } = require("../services/email/templates");

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

// Slugs that would collide with real routes or read as impersonating the
// platform itself — never allowed for a restaurant's own slug.
const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "captain", "kitchen", "onboard", "invite",
  "restaurant", "restaurants", "table", "tables", "login", "logout", "settings",
  "www", "servesync", "platform", "owner", "help", "support", "static", "assets",
  "nookambika", // the demo restaurant's own slug — never reassignable
]);

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "restaurant";

async function generateUniqueSlug(base) {
  let root = slugify(base);
  if (RESERVED_SLUGS.has(root)) root = `${root}-restaurant`;
  let slug = root;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.restaurant.findUnique({ where: { slug } });
    if (!existing && !RESERVED_SLUGS.has(slug)) return slug;
    suffix += 1;
    slug = `${root}-${suffix}`;
  }
}

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

    const slug = await generateUniqueSlug(name);
    const numTables = Math.min(Math.max(parseInt(tableCount, 10) || 8, 1), 50);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    let logoUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, "servesync-restaurants");
      logoUrl = uploadResult.secure_url;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name,
          slug,
          shortName: name.length > 24 ? name.slice(0, 24) : name,
          cuisine: cuisine || null,
          phone: phone || null,
          address: address || null,
          logo: logoUrl,
          primaryColor: primaryColor || "#E8891C",
          secondaryColor: "#3D2710",
          plan: "FREE_TRIAL",
          subscriptionStatus: "TRIALING",
          trialEndsAt,
        },
      });

      const admin = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail.toLowerCase(),
          password: hashedPassword,
          role: "ADMIN",
          restaurantId: restaurant.id,
        },
      });

      // New restaurants get secure QR by default — a real per-table token,
      // shown once here so the onboarding wizard can generate working
      // posters immediately. The demo restaurant deliberately stays in
      // legacy/open mode (no token), which is what keeps its QR codes and
      // every pre-Phase-7 table working unchanged.
      const tableCreates = [];
      const rawTokensByIndex = [];
      for (let i = 1; i <= numTables; i++) {
        const rawToken = generateRawToken();
        rawTokensByIndex.push(rawToken);
        tableCreates.push(
          tx.table.create({
            data: {
              code: `T${String(i).padStart(2, "0")}`,
              number: i,
              capacity: 4,
              isActive: true,
              restaurantId: restaurant.id,
              qrTokenHash: hashToken(rawToken),
              qrTokenRegeneratedAt: new Date(),
            },
          })
        );
      }
      const createdTables = await Promise.all(tableCreates);
      const tablesWithTokens = createdTables.map((table, i) => ({ ...table, qrToken: rawTokensByIndex[i] }));

      return { restaurant, admin, tables: tablesWithTokens };
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
