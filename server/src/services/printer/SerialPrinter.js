const { SerialPort } = require("serialport");
const printerConfigManager = require("./printerConfigManager");
const printerLogger = require("./printerLogger");

/**
 * Convert raw OS serial error codes into human-readable error messages
 */
function translateSerialError(err) {
  if (!err) return null;
  const msg = err.message || String(err);

  if (msg.includes("ENOENT") || msg.includes("file not found")) {
    return "Printer port not found or disconnected. Check USB cable.";
  }
  if (msg.includes("EACCES") || msg.includes("Permission denied")) {
    return "Permission denied accessing serial port. Check OS permissions.";
  }
  if (msg.includes("EBUSY") || msg.includes("Resource busy")) {
    return "Serial port is busy or open in another application.";
  }
  if (msg.includes("ENXIO") || msg.includes("No such device")) {
    return "Printer disconnected or powered off.";
  }

  return msg;
}

/**
 * SerialPrinter - Enterprise Hardware Driver for 80mm ESC/POS Thermal Printers
 * Features smart USB auto-detection, auto-reconnect, dynamic port listing, runtime reconfiguration, and logging.
 */
class SerialPrinter {
  constructor() {
    const config = printerConfigManager.getConfig();
    this.portPath = config.port;
    this.baudRate = config.baudRate;
    this.port = null;
    this.status = "DISCONNECTED"; // DISCONNECTED | CONNECTING | CONNECTED | ERROR | OFFLINE
    this.lastError = null;
    this.lastConnected = null;
    this.reconnectTimer = null;
    this.autoRetryCount = 0;
    this.maxAutoRetries = 2; // Stop auto-reconnecting after 2 startup retries if hardware missing

    printerLogger.info(`🖨️ [SerialPrinter] Driver configured for port: ${this.portPath} (Baud: ${this.baudRate})`);
    // Non-blocking initialization
    setImmediate(() => this.initAndConnect());
  }

  async initAndConnect() {
    await this.autoDetectUSBPort();
    this.connect();
  }

  /**
   * Scan system for all available physical serial / USB printer ports
   */
  static async listPorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map((p) => {
        let displayPath = p.path;
        return {
          path: displayPath,
          manufacturer: p.manufacturer || "Generic Serial Device",
          vendorId: p.vendorId || "",
          productId: p.productId || "",
          friendlyName: p.friendlyName || p.pnpId || p.path,
        };
      });
    } catch (err) {
      printerLogger.warn("Failed to list serial ports:", { error: err.message });
      return [];
    }
  }

  /**
   * Smart USB Auto-Detection: Automatically finds connected USB thermal printers
   */
  async autoDetectUSBPort() {
    try {
      const ports = await SerialPort.list();
      const usbPort = ports.find((p) => {
        const pathStr = (p.path || "").toLowerCase();
        const mfgStr = (p.manufacturer || "").toLowerCase();
        return (
          p.vendorId ||
          pathStr.includes("usbserial") ||
          pathStr.includes("wchusbserial") ||
          pathStr.includes("ttyusb") ||
          mfgStr.includes("prolific") ||
          mfgStr.includes("ftdi") ||
          mfgStr.includes("ch340")
        );
      });

      if (usbPort) {
        let detectedPath = usbPort.path;
        if (detectedPath.startsWith("/dev/tty.usbserial")) {
          detectedPath = detectedPath.replace("/dev/tty.usbserial", "/dev/cu.usbserial");
        } else if (detectedPath.startsWith("/dev/tty.wchusbserial")) {
          detectedPath = detectedPath.replace("/dev/tty.wchusbserial", "/dev/cu.wchusbserial");
        }

        if (detectedPath !== this.portPath) {
          printerLogger.info(`🔍 [SerialPrinter] Auto-detected USB printer port: ${detectedPath}`);
          this.portPath = detectedPath;
          printerConfigManager.saveConfig(this.portPath, this.baudRate);
          return true;
        }
      }
    } catch (err) {
      // Quiet catch
    }
    return false;
  }

  /**
   * Reconfigure printer port and baud rate dynamically without server restart
   */
  async reconfigure(newPortPath, newBaudRate) {
    printerLogger.info(`🔄 [SerialPrinter] Reconfiguring hardware to Port: ${newPortPath}, Baud: ${newBaudRate}...`);

    this.portPath = String(newPortPath).trim();
    this.baudRate = parseInt(newBaudRate, 10) || 9600;

    printerConfigManager.saveConfig(this.portPath, this.baudRate);

    if (this.port && this.port.isOpen) {
      try {
        await new Promise((res) => this.port.close(() => res(true)));
      } catch (e) {
        // Ignored
      }
    }

    this.port = null;
    this.status = "DISCONNECTED";
    this.lastError = null;
    this.autoRetryCount = 0;

    this.connect();
  }

  /**
   * Connect to physical serial port
   */
  connect() {
    if (this.port && this.port.isOpen) {
      this.status = "CONNECTED";
      return;
    }

    if (this.status === "CONNECTING") return;

    this.status = "CONNECTING";

    try {
      this.port = new SerialPort({
        path: this.portPath,
        baudRate: this.baudRate,
        autoOpen: false,
      });

      this.port.on("open", () => {
        this.status = "CONNECTED";
        this.lastError = null;
        this.autoRetryCount = 0;
        this.reconnectDelay = 5000;
        this.lastConnected = new Date().toISOString();
        printerLogger.info(`✅ [SerialPrinter] Connected to thermal printer at ${this.portPath}`);

        this.port.set({ dtr: true, rts: true }, (setErr) => {
          if (setErr) {
            printerLogger.warn(`⚠️ [SerialPrinter] Could not set DTR/RTS signals on ${this.portPath}`);
          }
        });
      });

      this.port.on("close", () => {
        this.status = "DISCONNECTED";
        this.scheduleReconnect();
      });

      this.port.on("error", (err) => {
        const friendlyMsg = translateSerialError(err);
        this.status = "ERROR";
        this.lastError = friendlyMsg;
        this.scheduleReconnect();
      });

      this.port.open(async (err) => {
        if (err) {
          const friendlyMsg = translateSerialError(err);
          this.status = "OFFLINE";
          this.lastError = friendlyMsg;

          if (err.message && (err.message.includes("ENOENT") || err.message.includes("cannot open"))) {
            const reconfigured = await this.autoDetectUSBPort();
            if (reconfigured) {
              return this.connect();
            }
          }

          this.scheduleReconnect();
        }
      });
    } catch (err) {
      const friendlyMsg = translateSerialError(err);
      this.status = "OFFLINE";
      this.lastError = friendlyMsg;
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule automatic reconnect attempt with auto-detection (capped retries)
   */
  scheduleReconnect() {
    if (this.reconnectTimer) return;

    this.autoRetryCount++;
    if (this.autoRetryCount > this.maxAutoRetries) {
      this.status = "OFFLINE";
      printerLogger.warn(`⚠️ [SerialPrinter] Thermal printer hardware unavailable at ${this.portPath}. Marked OFFLINE.`);
      return;
    }

    if (!this.reconnectDelay) {
      this.reconnectDelay = 5000;
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.autoDetectUSBPort();
      this.connect();
      this.reconnectDelay = Math.min((this.reconnectDelay || 5000) * 1.5, 60000);
    }, this.reconnectDelay);
  }

  /**
   * Write binary ESC/POS command Buffer to printer
   */
  async write(buffer) {
    if (!this.port || !this.port.isOpen) {
      await this.autoDetectUSBPort();
      this.connect();
      if (!this.port || !this.port.isOpen) {
        this.failedPrinted++;
        throw new Error(this.lastError || `Thermal printer offline at ${this.portPath}.`);
      }
    }

    return new Promise((resolve, reject) => {
      this.port.set({ dtr: true, rts: true }, () => {
        this.port.write(buffer, (err) => {
          if (err) {
            this.failedPrinted++;
            const friendlyMsg = translateSerialError(err);
            printerLogger.error(`❌ [SerialPrinter] Write error on ${this.portPath}:`, { error: friendlyMsg });
            return reject(new Error(friendlyMsg));
          }

          this.port.drain((drainErr) => {
            if (drainErr) {
              this.failedPrinted++;
              const friendlyMsg = translateSerialError(drainErr);
              printerLogger.error(`❌ [SerialPrinter] Drain error on ${this.portPath}:`, { error: friendlyMsg });
              return reject(new Error(friendlyMsg));
            }

            this.totalPrinted++;
            printerLogger.info(`✅ [SerialPrinter] Sent ${buffer.length} bytes successfully to ${this.portPath}`);
            resolve(true);
          });
        });
      });
    });
  }

  /**
   * Get comprehensive status metrics
   */
  getStatusInfo() {
    return {
      connected: this.status === "CONNECTED",
      status: this.status,
      port: this.portPath,
      baudRate: this.baudRate,
      lastError: this.lastError,
      lastConnected: this.lastConnected,
      stats: {
        totalPrinted: this.totalPrinted,
        failedPrinted: this.failedPrinted,
      },
    };
  }
}

module.exports = SerialPrinter;
