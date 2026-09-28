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

// Ambiguous characters (0/O, 1/I/l) excluded — this gets typed by hand from
// a welcome email on a phone, unlike generateRawToken's QR-embedded tokens.
const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** A one-time temporary password for a newly-approved restaurant's admin account. */
function generateTempPassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}

module.exports = { generateRawToken, hashToken, tokenMatches, generateInviteCode, generateTempPassword };
