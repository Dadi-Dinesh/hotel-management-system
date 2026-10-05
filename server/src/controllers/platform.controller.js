/**
 * platform.controller — the ServeSync Admin's view of its clients (approved
 * restaurants): profile, account status, credential + QR provisioning, and
 * the platform activity feed. Platform-level data only — this never returns
 * a tenant's orders, menu, reviews or analytics.
 */
const prisma = require("../config/db");
const { logAudit } = require("../utils/auditLog");
const { generateRawToken, hashToken } = require("../utils/tokenUtils");
const { sendEmail, isEmailConfigured } = require("../services/email/emailService");
const { clientCredentialsEmail } = require("../services/email/templates");
const { sendWhatsApp } = require("../services/whatsapp/whatsappService");
const { resolveProvider } = require("../services/whatsapp/providers");
const { isDemoRestaurant, getProvisionedAccounts, issueCredentials } = require("../services/platformClients");

function getClientBaseUrl() {
  const configured = process.env.CLIENT_URL?.split(",")[0]?.trim();
  return configured || "https://hotel-management-system-psi-kohl.vercel.app";
}

const DEMO_PROTECTED_MESSAGE =
  "The Sree Nookambika demo restaurant is protected — its logins, QR codes and status can't be changed from the platform portal.";

const clientStatus = (restaurant) => (restaurant.isActive ? "ACTIVE" : "SUSPENDED");

/** Latest order per restaurant — "last activity" without loading any order data. */
async function lastOrderByRestaurant(restaurantIds) {
  if (restaurantIds.length === 0) return {};
  const rows = await prisma.order.groupBy({
    by: ["restaurantId"],
    where: { restaurantId: { in: restaurantIds } },
    _max: { createdAt: true },
  });
  return Object.fromEntries(rows.map((r) => [r.restaurantId, r._max.createdAt]));
}

async function findRestaurantOr404(id, res) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: { application: { select: { id: true, email: true, ownerName: true, whatsapp: true, phone: true } } },
  });
  if (!restaurant) {
    res.status(404).json({ success: false, message: "Restaurant not found." });
    return null;
  }
  return restaurant;
}

/**
 * All ServeSync clients.
 * GET /api/platform/restaurants
 */
const listClients = async (req, res, next) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        application: { select: { id: true, ownerName: true, email: true, phone: true, city: true, reviewedAt: true } },
        users: { where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, take: 1, select: { name: true, email: true } },
        _count: { select: { tables: true } },
      },
    });

    const lastOrders = await lastOrderByRestaurant(restaurants.map((r) => r.id));

    const data = restaurants.map((r) => {
      const ownerUser = r.users[0] || null;
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        logo: r.logo,
        isDemo: isDemoRestaurant(r),
        status: clientStatus(r),
        ownerName: r.application?.ownerName || ownerUser?.name || null,
        email: r.application?.email || r.email || ownerUser?.email || null,
        phone: r.application?.phone || r.phone || null,
        city: r.application?.city || null,
        tableCount: r._count.tables,
        joinedAt: r.createdAt,
        approvedAt: r.application?.reviewedAt || null,
        lastActivityAt: lastOrders[r.id] || null,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * One client's platform-level profile: contact, account status,
 * provisioned logins (no passwords) and QR package state.
 * GET /api/platform/restaurants/:id
 */
const getClient = async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
      include: {
        application: { include: { reviewedBy: { select: { id: true, name: true, email: true } } } },
        _count: { select: { tables: true, users: true } },
      },
    });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }

    const [accounts, tableStats, lastQr, lastOrders, lastCredentials] = await Promise.all([
      getProvisionedAccounts(restaurant, restaurant.application?.email),
      prisma.table.groupBy({
        by: ["isActive"],
        where: { restaurantId: restaurant.id },
        _count: { _all: true, qrTokenHash: true },
      }),
      prisma.table.aggregate({ where: { restaurantId: restaurant.id }, _max: { qrTokenRegeneratedAt: true } }),
      lastOrderByRestaurant([restaurant.id]),
      prisma.auditLog.findFirst({
        where: { restaurantId: restaurant.id, action: { in: ["platform.credentials.issued", "platform.credentials.provisioned"] } },
        orderBy: { createdAt: "desc" },
        select: { action: true, createdAt: true },
      }),
    ]);

    const totalTables = tableStats.reduce((n, g) => n + g._count._all, 0);
    const activeTables = tableStats.filter((g) => g.isActive).reduce((n, g) => n + g._count._all, 0);
    const securedTables = tableStats.reduce((n, g) => n + g._count.qrTokenHash, 0);
    let qrStatus = "NOT_GENERATED";
    if (totalTables > 0 && securedTables === totalTables) qrStatus = "READY";
    else if (securedTables > 0) qrStatus = "PARTIAL";
    else if (totalTables > 0) qrStatus = "OPEN_MODE"; // legacy tables (the demo) — QR works without a token

    const app = restaurant.application;
    const toAccount = (role) => {
      const u = accounts[role];
      return { role, provisioned: Boolean(u), email: u?.email || null, createdAt: u?.createdAt || null };
    };

    res.json({
      success: true,
      data: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logo: restaurant.logo,
        cuisine: restaurant.cuisine,
        isDemo: isDemoRestaurant(restaurant),
        status: clientStatus(restaurant),
        plan: restaurant.plan,
        subscriptionStatus: restaurant.subscriptionStatus,
        registeredAt: app?.createdAt || restaurant.createdAt,
        joinedAt: restaurant.createdAt,
        approvedAt: app?.reviewedAt || null,
        approvedBy: app?.reviewedBy || null,
        lastActivityAt: lastOrders[restaurant.id] || null,
        owner: {
          name: app?.ownerName || accounts.ADMIN?.name || null,
          email: app?.email || accounts.ADMIN?.email || restaurant.email || null,
          phone: app?.phone || restaurant.phone || null,
          whatsapp: app?.whatsapp || null,
        },
        location: app
          ? { address: app.address, city: app.city, state: app.state, pincode: app.pincode }
          : { address: restaurant.address, city: null, state: null, pincode: null },
        application: app ? { id: app.id, tableCount: app.tableCount, submittedAt: app.createdAt } : null,
        accounts: ["ADMIN", "CAPTAIN", "KITCHEN"].map(toAccount),
        credentials: { lastIssuedAt: lastCredentials?.action === "platform.credentials.issued" ? lastCredentials.createdAt : null },
        qr: {
          totalTables,
          activeTables,
          securedTables,
          status: qrStatus,
          lastGeneratedAt: lastQr._max.qrTokenRegeneratedAt,
        },
        staffCount: restaurant._count.users,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend / activate a client. A suspended tenant's staff can't sign in or
 * use existing sessions (see middleware/auth.js) and its customer QR pages
 * return 404 (see middleware/tenant.js resolvePublicTenant).
 * PATCH /api/platform/restaurants/:id/status   { status: "ACTIVE" | "SUSPENDED" }
 */
const setClientStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!["ACTIVE", "SUSPENDED"].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be "ACTIVE" or "SUSPENDED".' });
    }
    const restaurant = await findRestaurantOr404(req.params.id, res);
    if (!restaurant) return;
    if (isDemoRestaurant(restaurant)) {
      return res.status(403).json({ success: false, message: DEMO_PROTECTED_MESSAGE });
    }

    const isActive = status === "ACTIVE";
    const updated = await prisma.restaurant.update({ where: { id: restaurant.id }, data: { isActive } });

    logAudit({
      action: isActive ? "platform.restaurant.activated" : "platform.restaurant.suspended",
      restaurantId: restaurant.id,
      userId: req.user.id,
      metadata: { restaurantName: restaurant.name },
    });

    res.json({
      success: true,
      message: `${updated.name} ${isActive ? "activated" : "suspended"}.`,
      data: { id: updated.id, status: clientStatus(updated) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * "Send Credentials" — resets the three provisioned logins to fresh
 * temporary passwords (hash stored, plaintext returned exactly once) and
 * attempts delivery through the configured channels. Delivery status is
 * reported honestly: with no email provider it's NOT_CONFIGURED, and the
 * WhatsApp notice (which never contains a password) is QUEUED until a
 * provider exists.
 * POST /api/platform/restaurants/:id/credentials
 */
const sendClientCredentials = async (req, res, next) => {
  try {
    const restaurant = await findRestaurantOr404(req.params.id, res);
    if (!restaurant) return;
    if (isDemoRestaurant(restaurant)) {
      return res.status(403).json({ success: false, message: DEMO_PROTECTED_MESSAGE });
    }

    const accounts = await issueCredentials(restaurant, restaurant.application?.email);
    const loginUrl = `${getClientBaseUrl()}/login`;
    const ownerEmail = restaurant.application?.email || accounts.find((a) => a.role === "ADMIN")?.email;
    const ownerName = restaurant.application?.ownerName || "there";

    let email = { status: "NOT_CONFIGURED", to: ownerEmail };
    if (isEmailConfigured()) {
      const message = clientCredentialsEmail({ ownerName, restaurantName: restaurant.name, accounts, loginUrl });
      const result = await sendEmail({ to: ownerEmail, subject: message.subject, html: message.html }).catch(() => ({ sent: false }));
      email = { status: result?.sent ? "SENT" : "FAILED", to: ownerEmail };
    }

    let whatsapp = { status: "NO_NUMBER", to: null };
    const waNumber = restaurant.application?.whatsapp || restaurant.phone;
    if (waNumber) {
      // Login IDs only — passwords are never written to the WhatsApp outbox table.
      const lines = accounts.map((a) => `${a.role === "ADMIN" ? "Restaurant Admin" : a.role === "CAPTAIN" ? "Captain" : "Kitchen"}: ${a.email}`);
      const result = await sendWhatsApp({
        to: waNumber,
        message: `Your ServeSync logins for "${restaurant.name}":\n${lines.join("\n")}\n\nTemporary passwords are shared with you separately by the ServeSync team.\nSign in: ${loginUrl}`,
        applicationId: restaurant.application?.id || null,
      });
      whatsapp = { status: result.status, to: waNumber };
    }

    logAudit({
      action: "platform.credentials.issued",
      restaurantId: restaurant.id,
      userId: req.user.id,
      metadata: { restaurantName: restaurant.name, roles: accounts.map((a) => a.role), email: email.status, whatsapp: whatsapp.status },
    });

    res.json({
      success: true,
      message: email.status === "SENT" ? "Credentials sent." : "Credentials generated. Delivery channels are not fully configured — share them securely.",
      data: { restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug }, accounts, loginUrl, delivery: { email, whatsapp } },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * Regenerate the QR package — rotates every table's secure QR token (old
 * printed QRs stop working) and returns the raw tokens once so the client
 * can render the poster PDF. Same token scheme as tables/regenerate-qr-bulk.
 * POST /api/platform/restaurants/:id/qr-package
 */
const regenerateQrPackage = async (req, res, next) => {
  try {
    const restaurant = await findRestaurantOr404(req.params.id, res);
    if (!restaurant) return;
    if (isDemoRestaurant(restaurant)) {
      return res.status(403).json({ success: false, message: DEMO_PROTECTED_MESSAGE });
    }

    const tables = await prisma.table.findMany({ where: { restaurantId: restaurant.id }, orderBy: { number: "asc" } });
    if (tables.length === 0) {
      return res.status(400).json({ success: false, message: "This restaurant has no tables to generate QR codes for." });
    }

    const now = new Date();
    const withTokens = tables.map((t) => ({ table: t, token: generateRawToken() }));
    await prisma.$transaction(
      withTokens.map(({ table, token }) =>
        prisma.table.update({ where: { id: table.id }, data: { qrTokenHash: hashToken(token), qrTokenRegeneratedAt: now } })
      )
    );

    logAudit({
      action: "platform.qr_package.generated",
      restaurantId: restaurant.id,
      userId: req.user.id,
      metadata: { restaurantName: restaurant.name, tableCount: tables.length },
    });

    res.json({
      success: true,
      message: `QR package regenerated for ${tables.length} table(s).`,
      data: {
        restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug, primaryColor: restaurant.primaryColor },
        tables: withTokens.map(({ table, token }) => ({ id: table.id, code: table.code, number: table.number, qrToken: token })),
        generatedAt: now,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Platform-level audit actions shown in the activity feed / notifications.
const ACTIVITY_MESSAGES = {
  "application.submitted": (m) => `New restaurant application received from ${m.restaurantName}.`,
  "application.approved": (m) => `${m.restaurantName} has been approved.`,
  "application.rejected": (m) => `${m.restaurantName} application was rejected.`,
  "application.info_requested": (m) => `More information requested from ${m.restaurantName || "an applicant"}.`,
  "platform.credentials.provisioned": (m) => `Credentials generated for ${m.restaurantName}.`,
  "platform.credentials.issued": (m) => `Credentials reissued for ${m.restaurantName}.`,
  "platform.qr_package.generated": (m) => `QR package generated for ${m.restaurantName}${m.tableCount ? ` (${m.tableCount} tables)` : ""}.`,
  "platform.restaurant.suspended": (m) => `${m.restaurantName} was suspended.`,
  "platform.restaurant.deactivated": (m) => `${m.restaurantName} was suspended.`,
  "platform.restaurant.activated": (m) => `${m.restaurantName} was activated.`,
};

/**
 * Platform activity / notifications feed, built from the persisted AuditLog.
 * GET /api/platform/activity?limit=50&before=<ISO date>
 */
const listActivity = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const where = { action: { in: Object.keys(ACTIVITY_MESSAGES) } };
    if (req.query.before) {
      const before = new Date(req.query.before);
      if (!Number.isNaN(before.getTime())) where.createdAt = { lt: before };
    }

    const logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: limit });

    const data = logs.map((log) => {
      const metadata = log.metadata && typeof log.metadata === "object" ? log.metadata : {};
      return {
        id: log.id,
        type: log.action,
        message: ACTIVITY_MESSAGES[log.action]({ restaurantName: "A restaurant", ...metadata }),
        applicationId: metadata.applicationId || null,
        restaurantId: log.restaurantId,
        createdAt: log.createdAt,
      };
    });

    res.json({ success: true, data, hasMore: logs.length === limit });
  } catch (error) {
    next(error);
  }
};

/**
 * Platform settings — the signed-in ServeSync Admin and the real state of
 * each delivery integration.
 * GET /api/platform/settings
 */
const getPlatformSettings = async (req, res, next) => {
  try {
    const provider = resolveProvider();
    const queuedWhatsApp = await prisma.whatsAppMessage.count({ where: { status: { in: ["QUEUED", "FAILED"] } } });
    res.json({
      success: true,
      data: {
        account: { id: req.user.id, name: req.user.name, email: req.user.email, role: "SERVESYNC_ADMIN" },
        integrations: {
          email: { configured: isEmailConfigured(), provider: null },
          whatsapp: { configured: provider.isConfigured(), provider: provider.isConfigured() ? provider.name : null, pendingMessages: queuedWhatsApp },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listClients,
  getClient,
  setClientStatus,
  sendClientCredentials,
  regenerateQrPackage,
  listActivity,
  getPlatformSettings,
};
