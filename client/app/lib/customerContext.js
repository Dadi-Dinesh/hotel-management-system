import api from "./api";
import { DEMO_RESTAURANT } from "./branding";

export function customerPaths(slug, code) {
  const tableCode = String(code || "").toUpperCase();
  const restaurantSlug = slug || DEMO_RESTAURANT.slug;
  const base = slug
    ? `/restaurant/${encodeURIComponent(slug)}/table/${encodeURIComponent(tableCode)}`
    : `/table/${encodeURIComponent(tableCode)}`;
  const sessionKey = slug
    ? `session-${slug}-${tableCode}`
    : `session-${tableCode}`;
  return { tableCode, restaurantSlug, base, sessionKey };
}
// Resolve the table with its existing QR check before trusting a stored session ID.
// This is client context validation, not a substitute for server authorization.
export async function loadCustomerContext(slug, code) {
  const context = customerPaths(slug, code);
  const tokenKey = slug
    ? `qr-token-${slug}-${context.tableCode}`
    : `qr-token-${context.tableCode}`;
  const token = localStorage.getItem(tokenKey);
  const tablePath = slug
    ? `/restaurants/${encodeURIComponent(slug)}/tables/${encodeURIComponent(context.tableCode)}`
    : `/tables/${encodeURIComponent(context.tableCode)}`;
  const [profile, tableResponse] = await Promise.all([
    api.get(`/restaurants/${encodeURIComponent(context.restaurantSlug)}`, {
      timeout: 12000,
    }),
    api.get(tablePath, { params: token ? { token } : {}, timeout: 12000 }),
  ]);
  const restaurant = profile.data.data;
  const table = tableResponse.data.data;
  if (table.restaurantId !== restaurant.id || table.code !== context.tableCode)
    throw new Error(
      "This table does not match the restaurant. Scan its QR code again.",
    );
  let session = null;
  if (table.activeSession) {
    const response = await api.get(`/sessions/${table.activeSession.id}`, {
      timeout: 12000,
    });
    session = response.data.data;
    if (session.restaurantId !== restaurant.id || session.tableId !== table.id)
      throw new Error(
        "The table session could not be verified. Scan its QR code again.",
      );
    if (session.status === "CLOSED") session = null;
  }
  if (session) localStorage.setItem(context.sessionKey, session.id);
  else localStorage.removeItem(context.sessionKey);
  return { ...context, restaurant, table, session };
}
