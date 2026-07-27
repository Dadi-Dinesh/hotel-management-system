const fs = require("fs");
const path = require("path");
const printerLogger = require("./printerLogger");

/**
 * PrinterConfigManager - Handles dynamic persistence of printer & KOT routing settings to server/src/config/printer.json
 */
class PrinterConfigManager {
  constructor() {
    this.configDir = path.join(__dirname, "../../config");
    this.configFilePath = path.join(this.configDir, "printer.json");
    this.defaultPort = process.env.PRINTER_PORT || "/dev/cu.usbserial-10";
    this.defaultBaudRate = parseInt(process.env.PRINTER_BAUD_RATE || "9600", 10);
    this.defaultKitchenMode = "LIVE"; // LIVE | NORMAL
    this.ensureConfigDir();
  }

  ensureConfigDir() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
    } catch (err) {
      printerLogger.error("Failed to create config directory:", { error: err.message });
    }
  }

  /**
   * Load current printer & kitchen mode settings
   */
  getConfig() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, "utf8");
        const data = JSON.parse(raw);
        return {
          port: data.port || this.defaultPort,
          baudRate: parseInt(data.baudRate || this.defaultBaudRate, 10),
          kitchenMode: data.kitchenMode === "NORMAL" ? "NORMAL" : "LIVE",
        };
      }
    } catch (err) {
      printerLogger.warn("Could not read printer.json, fallback to defaults", { error: err.message });
    }

    return {
      port: this.defaultPort,
      baudRate: this.defaultBaudRate,
      kitchenMode: this.defaultKitchenMode,
    };
  }

  /**
   * Save updated printer & kitchen mode settings
   */
  saveConfig(port, baudRate, kitchenMode = "LIVE") {
    const current = this.getConfig();
    const config = {
      port: String(port || current.port).trim(),
      baudRate: parseInt(baudRate || current.baudRate, 10) || 9600,
      kitchenMode: kitchenMode === "NORMAL" ? "NORMAL" : "LIVE",
      updatedAt: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(config, null, 2), "utf8");
      printerLogger.info("Saved new printer & kitchen mode configuration to printer.json", config);
      return config;
    } catch (err) {
      printerLogger.error("Failed to write printer.json:", { error: err.message });
      throw err;
    }
  }
}

const printerConfigManager = new PrinterConfigManager();
module.exports = printerConfigManager;
