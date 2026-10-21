const { authenticate } = require("../middleware/auth");
const prisma = require("../config/db");
async function staffSocketAccess(token, requestedId, roles) {
  if (!process.env.JWT_SECRET) throw new Error("Staff access is not configured.");
  const req = { headers: { authorization: token ? `Bearer ${token}` : "" } };
  let authenticated = false;
  await authenticate(req, { status() { return this; }, json() {} }, () => { authenticated = true; });
  if (!authenticated || !roles.includes(req.user.role)) throw new Error("Staff access denied.");
  const user = req.user;
  if (requestedId != null && (typeof requestedId !== "string" || !requestedId.trim())) throw new Error("Invalid restaurant.");
  if (user.restaurantId && requestedId && requestedId !== user.restaurantId) throw new Error("Restaurant access denied.");
  if (!user.restaurantId && user.role !== "ADMIN") throw new Error("Platform access denied.");
  const restaurantId = user.restaurantId || requestedId;
  if (!restaurantId) throw new Error("Select a restaurant first.");
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant?.isActive) throw new Error("Restaurant unavailable.");
  return { restaurantId, role: user.role };
}
async function revalidateSocket(socket, identity = socket.data.staff) {
  if (!identity) return false;
  if (identity.platform) {
    if (!process.env.JWT_SECRET) return false;
    const req = { headers: { authorization: `Bearer ${identity.token}` } };
    let valid = false;
    await authenticate(req, { status() { return this; }, json() {} }, () => { valid = true; });
    return valid && req.user.role === "ADMIN" && !req.user.restaurantId;
  }
  await staffSocketAccess(identity.token, identity.restaurantId, identity.roles);
  return true;
}
module.exports = { staffSocketAccess, revalidateSocket };
