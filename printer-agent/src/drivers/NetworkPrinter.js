const net = require("net");
const printerLogger = require("../utils/printerLogger");

const CONNECT_TIMEOUT_MS = 5000;

/**
 * NetworkPrinter - Raw-socket (port 9100) ESC/POS driver for IP-based
 * thermal/receipt printers. Port 9100 ("JetDirect"/raw) is the de-facto
 * standard nearly every network-capable ESC/POS printer listens on, so this
 * needs no per-vendor driver — same approach works for TVS, Epson, Rongta,
 * XPrinter, etc. once they're on the network instead of USB/serial.
 *
 * Unlike SerialPrinter this holds no persistent connection — each job opens
 * a fresh TCP socket, writes the buffer, and closes. Network printers don't
 * need the same keep-alive/auto-reconnect handling a USB cable does.
 */
class NetworkPrinter {
  /**
   * Write an ESC/POS buffer to ip:port. Resolves on success, rejects with a
   * human-readable error otherwise. Never throws synchronously.
   */
  static write(ip, port, buffer) {
    return new Promise((resolve, reject) => {
      if (!ip) {
        reject(new Error("Network printer IP address is required."));
        return;
      }

      const socket = new net.Socket();
      let settled = false;

      const finish = (err) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (err) reject(err);
        else resolve(true);
      };

      socket.setTimeout(CONNECT_TIMEOUT_MS);

      socket.once("timeout", () => {
        finish(new Error(`Timed out connecting to network printer at ${ip}:${port}.`));
      });

      socket.once("error", (err) => {
        finish(new Error(`Network printer connection failed (${ip}:${port}): ${err.message}`));
      });

      socket.connect(port || 9100, ip, () => {
        socket.write(buffer, (writeErr) => {
          if (writeErr) {
            finish(new Error(`Network printer write failed (${ip}:${port}): ${writeErr.message}`));
            return;
          }
          printerLogger.info(`✅ [NetworkPrinter] Sent ${buffer.length} bytes to ${ip}:${port}`);
          finish(null);
        });
      });
    });
  }

  /**
   * Bare connectivity test — used by the "Test Connection" button in the
   * Printer Discovery UI before a restaurant saves a network printer config.
   */
  static testConnection(ip, port) {
    return new Promise((resolve) => {
      if (!ip) {
        resolve({ success: false, error: "IP address is required." });
        return;
      }

      const socket = new net.Socket();
      let settled = false;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(CONNECT_TIMEOUT_MS);
      socket.once("timeout", () => finish({ success: false, error: "Connection timed out." }));
      socket.once("error", (err) => finish({ success: false, error: err.message }));
      socket.connect(port || 9100, ip, () => finish({ success: true }));
    });
  }
}

module.exports = NetworkPrinter;
