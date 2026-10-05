/**
 * platformClients — helpers for the ServeSync Admin side of a tenant: which
 * login accounts the platform provisioned for it, and the guard that keeps
 * the demo restaurant out of reach of destructive platform actions.
 *
 * Every approved restaurant gets three role logins:
 *   - Restaurant Admin → the applicant's own email
 *   - Captain          → captain.<slug>@servesync.app
 *   - Kitchen          → kitchen.<slug>@servesync.app
 * The Captain/Kitchen addresses are derived from the (immutable, unique)
 * slug, so they can always be looked up again without extra schema.
 */
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { generateTempPassword } = require("../utils/tokenUtils");

const DEMO_SLUG = "nookambika";
const ROLE_LOGIN_DOMAIN = "servesync.app";
const PROVISIONED_ROLES = ["ADMIN", "CAPTAIN", "KITCHEN"];

const isDemoRestaurant = (restaurant) => restaurant?.slug === DEMO_SLUG;

function roleLoginEmail(slug, role) {
  return `${role.toLowerCase()}.${slug}@${ROLE_LOGIN_DOMAIN}`;
}

/** Captain + Kitchen account specs for a brand-new tenant (passwords are random and never returned). */
function buildStaffAccountSpecs(slug, restaurantName) {
  return ["CAPTAIN", "KITCHEN"].map((role) => ({
    role,
    name: `${restaurantName} ${role === "CAPTAIN" ? "Captain" : "Kitchen"}`,
    email: roleLoginEmail(slug, role),
    password: generateTempPassword(),
  }));
}

/**
 * The platform-provisioned accounts for one restaurant. The Restaurant
 * Admin is the applicant's own account when there was an application,
 * otherwise the oldest ADMIN on the tenant. Never selects password hashes.
 */
async function getProvisionedAccounts(restaurant, applicationEmail = null) {
  const select = { id: true, name: true, email: true, role: true, createdAt: true };

  let admin = null;
  if (applicationEmail) {
    admin = await prisma.user.findFirst({
      where: { email: applicationEmail.toLowerCase(), restaurantId: restaurant.id, role: "ADMIN" },
      select,
    });
  }
  if (!admin) {
    admin = await prisma.user.findFirst({
      where: { restaurantId: restaurant.id, role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select,
    });
  }

  const [captain, kitchen] = await Promise.all(
    ["CAPTAIN", "KITCHEN"].map((role) =>
      prisma.user.findFirst({ where: { email: roleLoginEmail(restaurant.slug, role), restaurantId: restaurant.id }, select })
    )
  );

  return { ADMIN: admin, CAPTAIN: captain, KITCHEN: kitchen };
}

/**
 * Secure credential reset: issues a fresh temporary password for each
 * platform-provisioned account (creating a missing Captain/Kitchen login
 * on the way), stores only the bcrypt hash, and returns the plaintext once
 * to the caller. Any previous password for these accounts stops working.
 */
async function issueCredentials(restaurant, applicationEmail = null) {
  const existing = await getProvisionedAccounts(restaurant, applicationEmail);
  if (!existing.ADMIN) {
    const error = new Error("This restaurant has no Restaurant Admin account to issue credentials for.");
    error.statusCode = 400;
    throw error;
  }

  for (const role of ["CAPTAIN", "KITCHEN"]) {
    if (existing[role]) continue;
    // eslint-disable-next-line no-await-in-loop
    const clash = await prisma.user.findUnique({ where: { email: roleLoginEmail(restaurant.slug, role) }, select: { id: true } });
    if (clash) {
      const error = new Error(`The ${role.toLowerCase()} login for this restaurant is already used by another account.`);
      error.statusCode = 409;
      throw error;
    }
  }

  const plan = await Promise.all(
    PROVISIONED_ROLES.map(async (role) => {
      const tempPassword = generateTempPassword();
      return { role, tempPassword, hash: await bcrypt.hash(tempPassword, 12) };
    })
  );

  const accounts = await prisma.$transaction(async (tx) => {
    const out = [];
    for (const { role, tempPassword, hash } of plan) {
      const user = existing[role];
      // eslint-disable-next-line no-await-in-loop
      const saved = user
        ? await tx.user.update({ where: { id: user.id }, data: { password: hash }, select: { email: true, role: true } })
        : await tx.user.create({
            data: {
              name: `${restaurant.name} ${role === "CAPTAIN" ? "Captain" : "Kitchen"}`,
              email: roleLoginEmail(restaurant.slug, role),
              password: hash,
              role,
              restaurantId: restaurant.id,
            },
            select: { email: true, role: true },
          });
      out.push({ role: saved.role, email: saved.email, tempPassword });
    }
    return out;
  });

  return accounts;
}

module.exports = {
  DEMO_SLUG,
  PROVISIONED_ROLES,
  isDemoRestaurant,
  roleLoginEmail,
  buildStaffAccountSpecs,
  getProvisionedAccounts,
  issueCredentials,
};
