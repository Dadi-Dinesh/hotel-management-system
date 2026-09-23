const crypto = require("crypto");

/** A high-entropy, URL-safe secret — only ever shown once, at generation time. */
function generateRawToken() {
  return crypto.randomBytes(24).toString("base64url");
}

/** Only the hash is ever persisted — the raw token can't be recovered from the DB. */
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function tokenMatches(rawToken, storedHash) {
  if (!rawToken || !storedHash) return false;
  const candidate = hashToken(rawToken);
  // Constant-time compare to avoid leaking timing information about the hash.
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Short, human-typeable invite code (e.g. staff joining by hand). */
function generateInviteCode() {
  return crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 chars
}

module.exports = { generateRawToken, hashToken, tokenMatches, generateInviteCode };
