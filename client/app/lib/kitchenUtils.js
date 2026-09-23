/**
 * Pure helper functions for the Kitchen Display System board.
 * No API calls, no side effects — safe to unit-reason about and memoize around.
 */

// Elapsed-time color thresholds (minutes), per spec:
// 0–5 green, 5–10 yellow, 10–15 orange, 15+ red.
export function getElapsedColor(elapsedMs) {
  const minutes = elapsedMs / 60000;
  if (minutes < 5) return { bg: "#064E3B", text: "#6EE7B7", border: "#10B981", label: "green" };
  if (minutes < 10) return { bg: "#78350F", text: "#FDE68A", border: "#F59E0B", label: "yellow" };
  if (minutes < 15) return { bg: "#7C2D12", text: "#FDBA74", border: "#EA580C", label: "orange" };
  return { bg: "#7F1D1D", text: "#FCA5A5", border: "#EF4444", label: "red" };
}

export function formatElapsed(elapsedMs) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Merge duplicate order items (same menu item) into a single display row with
 * a summed quantity. Purely a display concern — never mutates or affects what
 * gets sent to the KOT printer, which still prints from the raw order.items.
 */
export function groupOrderItems(items = []) {
  const map = new Map();
  items.forEach((item) => {
    const key = item.menuItemId || item.menuItem?.id || item.name;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.rawIds.push(item.id);
      if (item.status !== "SERVED") existing.allServed = false;
    } else {
      map.set(key, {
        key,
        name: item.menuItem?.name || item.name,
        isVeg: item.menuItem?.isVeg,
        quantity: item.quantity,
        allServed: item.status === "SERVED",
        rawIds: [item.id],
      });
    }
  });
  return Array.from(map.values());
}

// A ticket counts as "large" once it crosses this many total items.
const LARGE_ORDER_ITEM_THRESHOLD = 6;
// A ticket counts as "delayed" once it's been active this long.
const DELAYED_ORDER_MINUTES = 10;

/**
 * High priority when the order is delayed (old) or unusually large.
 * Deterministic, derived entirely from data already on the order — no
 * backend changes or hidden state involved.
 */
export function computePriority(order, elapsedMs) {
  const elapsedMinutes = elapsedMs / 60000;
  const totalQty = (order.items || []).reduce((sum, i) => sum + i.quantity, 0);
  const isDelayed = elapsedMinutes >= DELAYED_ORDER_MINUTES;
  const isLarge = totalQty >= LARGE_ORDER_ITEM_THRESHOLD;
  return { isHigh: isDelayed || isLarge, isDelayed, isLarge, totalQty };
}

/** Short, stable, human-scannable reference for a session — not a real "number" field (none exists in the schema). */
export function shortSessionRef(sessionId = "") {
  return sessionId ? sessionId.slice(-5).toUpperCase() : "—";
}
