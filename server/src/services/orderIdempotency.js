const { createHash } = require("crypto");
const include = { items: { include: { menuItem: true } }, session: { include: { table: true } } };
function describeRequest(key, items) {
  if (typeof key !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) {
    throw Object.assign(new Error("A valid Idempotency-Key header is required."), { statusCode: 400 });
  }
  const normalized = items.map(({ menuItemId, quantity }) => ({ menuItemId, quantity })).sort((a,b) => a.menuItemId.localeCompare(b.menuItemId));
  const requestHash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  return { idempotencyKey: key, requestHash };
}
async function findReplay(db, session, request) {
  const order = await db.order.findUnique({ where: { restaurantId_sessionId_idempotencyKey: {
    restaurantId: session.restaurantId, sessionId: session.id, idempotencyKey: request.idempotencyKey,
  } }, include });
  if (order && order.requestHash !== request.requestHash) {
    throw Object.assign(new Error("This request key was already used for a different order."), { statusCode: 409 });
  }
  return order;
}
module.exports = { describeRequest, findReplay };
