/**
 * validateEnv — checks required configuration at startup, before the
 * server ever binds a port. A missing DATABASE_URL or JWT_SECRET today
 * fails minutes later with a cryptic Prisma/jsonwebtoken stack trace from
 * whichever request happens to hit it first; this makes the failure
 * immediate, obvious, and actionable instead.
 */
const logger = require("../utils/logger");

const REQUIRED_VARS = [
  { key: "DATABASE_URL", hint: "PostgreSQL connection string (Neon or any Postgres). Copy server/.env.example." },
  { key: "JWT_SECRET", hint: "Any long random string — used to sign staff/admin session tokens." },
];

const RECOMMENDED_VARS = [
  { key: "CLOUDINARY_CLOUD_NAME", hint: "Logo/menu-photo uploads will fail without all three CLOUDINARY_* vars." },
  { key: "CLOUDINARY_API_KEY", hint: "Logo/menu-photo uploads will fail without all three CLOUDINARY_* vars." },
  { key: "CLOUDINARY_API_SECRET", hint: "Logo/menu-photo uploads will fail without all three CLOUDINARY_* vars." },
  { key: "CLIENT_URL", hint: "Falls back to the hardcoded Vercel URL + localhost — set this for a custom domain." },
  { key: "PRINTER_AGENT_KEY", hint: "Falls back to a default shared secret baked into source — set your own in production." },
];

const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Exits the process with a clear, actionable message if a genuinely
 * required variable is missing. Only warns (never exits) for recommended-
 * but-optional configuration, since large parts of the app work fine
 * without Cloudinary/a custom CLIENT_URL/a custom printer key.
 */
function validateEnv() {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v.key] || !process.env[v.key].trim());

  if (missing.length > 0) {
    logger.error("❌ Server cannot start — required environment variables are missing:");
    missing.forEach((v) => logger.error(`   ${v.key} — ${v.hint}`));
    logger.error("   See server/.env.example for the full list and format.");
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    logger.warn(`⚠️  JWT_SECRET is shorter than the recommended ${MIN_JWT_SECRET_LENGTH} characters — consider rotating to a longer random value in production.`);
  }

  const missingRecommended = RECOMMENDED_VARS.filter((v) => !process.env[v.key] || !process.env[v.key].trim());
  missingRecommended.forEach((v) => {
    logger.warn(`⚠️  ${v.key} is not set — ${v.hint}`);
  });

  logger.info("✓ Environment configuration validated");
}

module.exports = { validateEnv, REQUIRED_VARS, RECOMMENDED_VARS };
