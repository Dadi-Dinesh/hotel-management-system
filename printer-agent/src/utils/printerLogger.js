const fs = require("fs");
const path = require("path");

class PrinterLogger {
  constructor() {
    this.logDir = path.join(__dirname, "../../logs");
    this.logFile = path.join(this.logDir, "agent.log");
    this.ensureLogDir();
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      console.error("Failed to create logger directory:", err.message);
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
  }

  writeLog(level, message, meta) {
    const logLine = this.formatMessage(level, message, meta);
    console.log(logLine.trim());

    try {
      fs.appendFileSync(this.logFile, logLine, "utf8");
    } catch (err) {
      // Quiet fail if filesystem unwritable
    }
  }

  info(message, meta = {}) {
    this.writeLog("INFO", message, meta);
  }

  warn(message, meta = {}) {
    this.writeLog("WARN", message, meta);
  }

  error(message, meta = {}) {
    this.writeLog("ERROR", message, meta);
  }
}

module.exports = new PrinterLogger();
