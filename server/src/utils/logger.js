/**
 * logger — structured, dependency-free logging (Phase 12).
 *
 * Development: colored, human-readable single-line output — easy to scan
 * in a terminal while iterating.
 * Production: single-line JSON per entry — the shape every hosting
 * platform's log aggregator (Render, Vercel, etc.) can parse without a
 * custom parser, while still being readable raw.
 *
 * Deliberately NOT a new npm dependency (winston/pino) — this app already
 * has a proven pattern for this (printerLogger.js) and a JSON-API server
 * doesn't need more than level + message + structured metadata.
 */
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const COLORS = {
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  reset: "\x1b[0m",
};

function emit(level, message, meta) {
  const timestamp = new Date().toISOString();

  if (IS_PRODUCTION) {
    // One JSON object per line — safe to pipe into any log aggregator.
    const entry = { timestamp, level, message, ...(meta ? { meta } : {}) };
    const line = JSON.stringify(entry);
    if (level === "error") process.stderr.write(line + "\n");
    else process.stdout.write(line + "\n");
    return;
  }

  const color = COLORS[level] || "";
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  const line = `${color}[${timestamp}] [${level.toUpperCase()}]${COLORS.reset} ${message}${metaStr}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

const logger = {
  info: (message, meta) => emit("info", message, meta),
  warn: (message, meta) => emit("warn", message, meta),
  error: (message, meta) => emit("error", message, meta),
};

module.exports = logger;
