const fs = require("fs");
const path = require("path");

/**
 * PrinterLogger - Logs hardware printer events to server/logs/printer.log
 * Never logs receipt content or private customer data.
 */
class PrinterLogger {
  constructor() {
    this.logDir = path.join(__dirname, "../../../logs");
    this.logFilePath = path.join(this.logDir, "printer.log");
    this.ensureLogDir();
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      console.error("❌ Failed to create logs directory:", err.message);
    }
  }

  log(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;

    // Always log to console
    if (level === "error") {
      console.error(message, meta || "");
    } else if (level === "warn") {
      console.warn(message, meta || "");
    } else {
      console.log(message, meta || "");
    }

    // Append to printer.log file
    try {
      fs.appendFileSync(this.logFilePath, logLine, "utf8");
    } catch (err) {
      console.error("❌ Failed to append to printer.log:", err.message);
    }
  }

  info(msg, meta) {
    this.log("info", msg, meta);
  }

  warn(msg, meta) {
    this.log("warn", msg, meta);
  }

  error(msg, meta) {
    this.log("error", msg, meta);
  }
}

const printerLogger = new PrinterLogger();
module.exports = printerLogger;
