export function readOrderAttempt(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key));
    return value && typeof value.key === "string" && typeof value.sessionId === "string" && Array.isArray(value.items) ? value : null;
  } catch { return null; }
}
export function createOrderAttempt(storage, key, sessionId, items, randomUUID) {
  const attempt = { key: randomUUID(), sessionId, items: items.map(({ menuItemId, quantity }) => ({ menuItemId, quantity })) };
  // Fail before sending if the retry identity cannot survive a reload.
  storage.setItem(key, JSON.stringify(attempt));
  return attempt;
}
