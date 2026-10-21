const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { tokenMatches } = require("../utils/tokenUtils");

function denied(message = "Scan this table's QR code again.", status = 403) {
  return Object.assign(new Error(message), { status, statusCode: status });
}
function secret() {
  if (!process.env.JWT_SECRET) throw denied("Customer access is not configured.", 503);
  return process.env.JWT_SECRET;
}
async function validateTable(table, qrToken) {
  secret(); // Fail before any session write if signing is not configured.
  const restaurant = table && await prisma.restaurant.findUnique({ where: { id: table.restaurantId } });
  if (!restaurant?.isActive || !table?.isActive) throw denied("Restaurant or table is unavailable.");
  if (table.qrTokenHash) {
    if (!tokenMatches(qrToken, table.qrTokenHash)) throw denied();
  } else if (restaurant.slug !== "nookambika") {
    throw denied("This table needs a secure QR code. Please ask restaurant staff.");
  }
  return restaurant;
}
function issueCustomerAccess(table, session = null) {
  return jwt.sign({ tableId: table.id, restaurantId: table.restaurantId,
    sessionId: session?.id || null, qrVersion: table.qrTokenHash || null }, secret(),
    { audience: "servesync-customer", expiresIn: "12h", algorithm: "HS256" });
}
async function verifyCustomerAccess(token, sessionId, { allowClosed = false } = {}) {
  let claim;
  try { claim = jwt.verify(token, secret(), { audience: "servesync-customer", algorithms: ["HS256"] }); }
  catch (error) { if (error.status === 503) throw error; throw denied(); }
  const table = await prisma.table.findUnique({ where: { id: claim.tableId } });
  const restaurant = table && await prisma.restaurant.findUnique({ where: { id: table.restaurantId } });
  if (!table?.isActive || !restaurant?.isActive || table.restaurantId !== claim.restaurantId ||
      (table.qrTokenHash || null) !== claim.qrVersion || (!table.qrTokenHash && restaurant.slug !== "nookambika")) throw denied();
  let session = null;
  const target = sessionId || claim.sessionId;
  if (target) {
    if (claim.sessionId !== target) throw denied();
    session = await prisma.session.findUnique({ where: { id: target } });
    if (!session || session.tableId !== table.id || session.restaurantId !== restaurant.id) throw denied();
    if (!allowClosed && !["ACTIVE", "BILL_REQUESTED"].includes(session.status)) throw denied("This session has been closed.", 409);
  }
  return { table, restaurant, session };
}
module.exports = { validateTable, issueCustomerAccess, verifyCustomerAccess };
