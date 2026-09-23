/**
 * AppError — the one error class every controller should throw for an
 * expected, user-facing failure (validation, not-found, forbidden, etc.).
 *
 * `isOperational = true` marks it as "safe to show `.message` to the
 * client" — errorHandler.js uses that flag to decide what a production
 * response is allowed to reveal. Anything thrown WITHOUT this flag (a raw
 * TypeError, a Prisma internals error, anything unexpected) is treated as
 * a bug: logged in full server-side, but shown to the client as a generic
 * "something went wrong" in production — never its raw `.message`.
 */
class AppError extends Error {
  constructor(message, statusCode = 400, meta) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = true;
    if (meta) this.meta = meta;
    Error.captureStackTrace?.(this, AppError);
  }
}

module.exports = AppError;
