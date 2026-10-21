// Keep credentials per session/table, never in one global "current tenant" slot.
const memory = new Map();
function read(key) {
  try { return sessionStorage.getItem(key) || memory.get(key) || null; }
  catch { return memory.get(key) || null; }
}
function write(key, token) {
  memory.set(key, token);
  try { sessionStorage.setItem(key, token); } catch { /* In-memory use still works. */ }
}
export function rememberCustomerAccess(data, url = "") {
  if (!data?.customerAccess) return;
  const table = data.table || data;
  const slug = url.match(/\/restaurants\/([^/]+)/)?.[1] || "nookambika";
  const sessionId = data.activeSession?.id || (data.tableId ? data.id : null);
  write(`customer-table:${decodeURIComponent(slug)}:${table.code}`, data.customerAccess);
  if (sessionId) write(`customer-session:${sessionId}`, data.customerAccess);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("customer-access-updated"));
}
export function customerAccessForSession(id) {
  return id ? read(`customer-session:${id}`) : null;
}
export function customerJoinPayload(slug, tableCode) {
  const restaurantSlug = slug || "nookambika";
  return { restaurantSlug, tableCode, customerAccess: read(`customer-table:${restaurantSlug}:${tableCode}`) };
}
