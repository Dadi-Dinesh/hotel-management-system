/**
 * Global error handler middleware (Phase 12 — hardened for production).
 *
 * Every specific, pre-existing case below (Prisma P2002/P2025, JWT errors,
 * Multer file-size) is untouched — same status codes, same messages, same
 * behavior as before this phase.
 *
 * What's new is the *fallback* branch: an error only reaches it when it's
 * NOT one of those recognized cases. In production, its raw `.message` is
 * only shown to the client when the error explicitly set a 4xx status (a
 * deliberate, safe validation/business message — e.g. AppError, or the
 * CORS origin check) or is flagged `isOperational`. Anything else — an
 * unexpected crash defaulting to 500 — always gets a generic message in
 * production, while the full error (with stack) is still logged
 * server-side for debugging. Development always sees the real message.
 */
const logger = require("../utils/logger");

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} → ${err.message}`, {
    stack: err.stack,
    statusCode: err.statusCode,
  });

  // Prisma-specific errors
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
      field: err.meta?.target,
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found.",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please log in again.",
    });
  }

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size is 10MB.",
    });
  }

  // Fallback — everything not specifically recognized above.
  const statusCode = err.statusCode || 500;
  const isSafeToShow = err.isOperational === true || statusCode < 500;
  const message = !IS_PRODUCTION || isSafeToShow ? err.message || "An error occurred." : "Something went wrong on our end. Please try again.";

  if (!res.headersSent) {
    res.status(statusCode).json({ success: false, message });
  }
};

module.exports = errorHandler;
