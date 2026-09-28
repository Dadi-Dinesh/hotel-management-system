/**
 * restaurantProvisioning — the one place that actually creates a tenant.
 *
 * Extracted from restaurant.controller.js's createRestaurant (the legacy
 * instant-onboarding endpoint) so the new application-approval flow can
 * reuse the exact same transaction instead of duplicating it. Behavior is
 * unchanged from the original inline version — same slug rules, same table/
 * QR-token generation, same trial window.
 */
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { generateRawToken, hashToken } = require("../utils/tokenUtils");

// Slugs that would collide with real routes or read as impersonating the
// platform itself — never allowed for a restaurant's own slug.
const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "captain", "kitchen", "onboard", "invite",
  "restaurant", "restaurants", "table", "tables", "login", "logout", "settings",
  "www", "servesync", "platform", "owner", "help", "support", "static", "assets",
  "apply", "application-status", // reserved for the application-workflow routes
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
 * Creates a Restaurant + its first Admin user + N tables (each with a real,
 * secure per-table QR token) in a single transaction. Callers are
 * responsible for validating input beforehand and for anything after
 * (issuing a login token, sending emails, audit logging) — this function's
 * only job is the provisioning transaction itself.
 *
 * @returns {{ restaurant, admin, tables: Array<table & { qrToken: string }> }}
 */
async function provisionRestaurant({
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
}) {
  const slug = await generateUniqueSlug(name);
  const numTables = Math.min(Math.max(parseInt(tableCount, 10) || 8, 1), 50);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  return prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        name,
        slug,
        shortName: name.length > 24 ? name.slice(0, 24) : name,
        cuisine: cuisine || null,
        phone: phone || null,
        address: address || null,
        logo: logoUrl || null,
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
    // shown once here so the caller can generate working posters immediately.
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
}

module.exports = { provisionRestaurant, generateUniqueSlug, RESERVED_SLUGS };
