/**
 * Minimal in-memory rate limiter — a placeholder, not a production-grade
 * distributed limiter. Fine for a single Node process; a real deployment
 * behind multiple instances would need a shared store (Redis) instead.
 * Fixed window per IP, applied only to a handful of sensitive endpoints
 * (login, onboarding, invite acceptance) — never to normal traffic, so it
 * cannot change existing behavior for anything already working.
 */
const buckets = new Map();

// Periodic cleanup so the map doesn't grow unbounded on a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

function rateLimit({ windowMs = 5 * 60 * 1000, max = 20, message = "Too many requests. Please try again shortly." } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const key = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();

    let entry = buckets.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }

    next();
  };
}

module.exports = { rateLimit };
