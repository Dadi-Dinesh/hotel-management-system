/**
 * insightCache — tiny in-memory TTL cache for derived analytics.
 *
 * The AI Copilot's numbers are always recomputed from real orders/sessions/
 * feedback (never fabricated) — this only avoids re-scanning the same
 * restaurant's order history on every dashboard poll/socket refresh within
 * a short window. A single Node process's Map is fine here: this app has no
 * multi-instance deployment, matching the same single-instance assumption
 * already documented for the in-memory rate limiter (Phase 7).
 */
class InsightCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = 60000) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Drops every cached entry for a restaurant — called after nothing right
   * now, since staleness of up to ~60s is an accepted tradeoff for a
   * dashboard widget, not a billing-critical number. */
  invalidate(restaurantId) {
    for (const key of this.store.keys()) {
      if (key.startsWith(`${restaurantId}:`)) this.store.delete(key);
    }
  }
}

module.exports = new InsightCache();
