require("dotenv").config();

const { io } = require("socket.io-client");
const SerialPrinter = require("./drivers/SerialPrinter");
const NetworkPrinter = require("./drivers/NetworkPrinter");
const PrintQueue = require("./queue/PrintQueue");
const printerConfigManager = require("./config/printerConfigManager");
const { buildCustomerBillReceipt } = require("./formatters/receiptPrinter");
const { buildKOTReceipt } = require("./formatters/kotPrinter");
const kotRoutingService = require("./formatters/kotRoutingService");
const EscPosBuilder = require("./formatters/escposBuilder");
const printerLogger = require("./utils/printerLogger");

// Strict environment variable validation for BACKEND_URL (No hardcoded localhost fallback)
const BACKEND_URL = process.env.BACKEND_URL ? process.env.BACKEND_URL.trim() : null;

if (!BACKEND_URL) {
  printerLogger.error("❌ [Agent Startup Error] BACKEND_URL environment variable is missing!");
  printerLogger.error("   Please define BACKEND_URL in printer-agent/.env (e.g. BACKEND_URL=https://hotel-management-system-k5zr.onrender.com)");
  process.exit(1);
}

const PRINTER_AGENT_KEY = process.env.PRINTER_AGENT_KEY || "nookambika_printer_secret_key_2026";

printerLogger.info("🚀 Starting Local Thermal Printer Agent...");
printerLogger.info(`📡 Connecting to Backend: ${BACKEND_URL}`);

// Initialize Hardware Drivers & Queue
const serialPrinter = new SerialPrinter();
const printQueue = new PrintQueue(serialPrinter);

// Connect to Render Backend over Socket.IO with auto-reconnect
const socket = io(BACKEND_URL, {
  auth: {
    apiKey: PRINTER_AGENT_KEY,
    agentType: "PRINTER_AGENT",
  },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  transports: ["websocket", "polling"],
});

// Helper to assemble comprehensive status payload
function getAgentStatusPayload() {
  const hardwareStatus = serialPrinter.getStatusInfo();
  const queueMetrics = printQueue.getMetrics();
  const config = printerConfigManager.getConfig();

  return {
    online: hardwareStatus.connected,
    status: hardwareStatus.status,
    port: hardwareStatus.port,
    baudRate: hardwareStatus.baudRate,
    kitchenMode: config.kitchenMode,
    printerTarget: config.printerTarget || "ALL",
    lastConnected: hardwareStatus.lastConnected,
    lastError: hardwareStatus.lastError,
    queue: queueMetrics,
    queueLength: queueMetrics.waitingJobs,
    lastPrinted: queueMetrics.lastPrinted,
    stats: hardwareStatus.stats,
    timestamp: new Date().toISOString(),
  };
}

// 1. Socket Connected / Reconnected to Render Backend
socket.on("connect", () => {
  printerLogger.info(`✅ [Agent] Connected to Render Backend at ${BACKEND_URL} (Socket ID: ${socket.id})`);

  // Re-emit handshake and process any unprinted items restored from local disk queue
  socket.emit("printer:agent:connect", getAgentStatusPayload());
  printQueue.processQueue();
});

// 2. Socket Disconnected / Connection Error
socket.on("disconnect", (reason) => {
  printerLogger.warn(`⚠️ [Agent] Socket disconnected from backend: ${reason}`);
});

socket.on("connect_error", (err) => {
  printerLogger.error(`❌ [Agent] Backend connection error (${BACKEND_URL}): ${err.message}`);
});

// 3. Periodic Heartbeat (Every 10 seconds)
setInterval(() => {
  if (socket.connected) {
    socket.emit("printer:heartbeat", getAgentStatusPayload());
  }
}, 10000);

// 4. Handle incoming print jobs from backend
socket.on("print:job", async (jobPayload, callback) => {
  const { jobId, type, order, copyLabel, printerTarget, paperWidth, networkPrinter } = jobPayload || {};

  printerLogger.info(`📥 [Agent] Received print job ${jobId} (Type: ${type}, Target: ${printerTarget || "ALL"}${networkPrinter ? `, Network: ${networkPrinter.ip}:${networkPrinter.port || 9100}` : ""})`);

  // Network printers (IP:port, ESC/POS raw-socket) bypass the persistent
  // serial queue entirely — they don't share the "unplugged USB cable"
  // failure mode a serial port does, so a direct write + the existing
  // 30s ack-timeout/retry at the CloudPrinterGateway layer is sufficient.
  if (networkPrinter && networkPrinter.ip) {
    try {
      let buffer;
      if (type === "BILL") buffer = buildCustomerBillReceipt(order, paperWidth);
      else if (type === "KOT") buffer = buildKOTReceipt(order, copyLabel, paperWidth);
      else throw new Error(`Unsupported network job type: ${type}`);

      await NetworkPrinter.write(networkPrinter.ip, networkPrinter.port, buffer);

      const ackPayload = { jobId, success: true, error: null, timestamp: new Date().toISOString() };
      if (typeof callback === "function") callback(ackPayload);
      socket.emit("print:ack", ackPayload);
      printerLogger.info(`✅ [Agent] Network print job ${jobId} delivered to ${networkPrinter.ip}:${networkPrinter.port || 9100}`);
    } catch (err) {
      printerLogger.error(`❌ [Agent] Network print job ${jobId} failed: ${err.message}`);
      const errPayload = { jobId, success: false, error: err.message, timestamp: new Date().toISOString() };
      if (typeof callback === "function") callback(errPayload);
      socket.emit("print:ack", errPayload);
    }
    return;
  }

  try {
    let buffer = null;

    if (type === "BILL") {
      buffer = buildCustomerBillReceipt(order, paperWidth);
      await printQueue.enqueue({ id: jobId, type: "BILL", buffer, printerTarget });
    } else if (type === "KOT") {
      const config = printerConfigManager.getConfig();
      const kitchenMode = config.kitchenMode || "LIVE";
      const routedJobs = kotRoutingService.routeOrder(order, kitchenMode);

      for (let i = 0; i < routedJobs.length; i++) {
        const subJob = routedJobs[i];
        const kotBuffer = buildKOTReceipt(subJob.order, subJob.copyLabel, paperWidth);
        const subJobId = routedJobs.length > 1 ? `${jobId}-KOT-${i + 1}` : jobId;
        await printQueue.enqueue({
          id: subJobId,
          type: `KOT (${subJob.copyLabel})`,
          buffer: kotBuffer,
          printerTarget,
        });
      }
    } else if (type === "TEST") {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB");
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const builder = new EscPosBuilder();
      builder
        .divider("=")
        .align("center")
        .bold(true)
        .size(2, 2)
        .textLine("SREE NOOKAMBIKA")
        .size(1, 1)
        .textLine("FAMILY DHABA")
        .feed(1)
        .textLine("PRINTER AGENT READY")
        .size(1, 1)
        .bold(false)
        .textLine(`Agent Connected to Render`)
        .textLine(`Port: ${serialPrinter.portPath}`)
        .textLine(`Baud: ${serialPrinter.baudRate}`)
        .textLine(`Kitchen Mode: ${printerConfigManager.getConfig().kitchenMode}`)
        .textLine(`Date: ${dateStr}`)
        .textLine(`Time: ${timeStr}`)
        .divider("=")
        .feed(4)
        .cut();

      buffer = builder.build();
      await printQueue.enqueue({ id: jobId, type: "TEST", buffer, printerTarget });
    } else {
      throw new Error(`Unsupported job type: ${type}`);
    }

    const ackPayload = {
      jobId,
      success: true,
      error: null,
      timestamp: new Date().toISOString(),
    };

    if (typeof callback === "function") {
      callback(ackPayload);
    }
    socket.emit("print:ack", ackPayload);

    printerLogger.info(`✅ [Agent] Successfully processed print job ${jobId}`);
  } catch (err) {
    printerLogger.error(`❌ [Agent] Failed to print job ${jobId}: ${err.message}`);

    const errPayload = {
      jobId,
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    };

    if (typeof callback === "function") {
      callback(errPayload);
    }
    socket.emit("print:ack", errPayload);
  }
});

// 5. Handle Administrative Reconnect request from server
socket.on("printer:reconnect", async (data, callback) => {
  printerLogger.info("🔄 [Agent] Force reconnect command received from backend.");
  serialPrinter.connect();
  const status = getAgentStatusPayload();
  if (typeof callback === "function") callback({ success: true, status });
  socket.emit("printer:heartbeat", status);
});

// 6. Handle Administrative Configuration Update request from server
socket.on("printer:update-config", async (data, callback) => {
  const { port, baudRate, kitchenMode, printerTarget } = data || {};
  printerLogger.info(`⚙️ [Agent] Reconfiguration command received from backend: Port ${port}, Baud ${baudRate}, KitchenMode ${kitchenMode}`);

  const updatedConfig = printerConfigManager.saveConfig(port, baudRate, kitchenMode, printerTarget);
  await serialPrinter.reconfigure(updatedConfig.port, updatedConfig.baudRate);

  const status = getAgentStatusPayload();
  if (typeof callback === "function") callback({ success: true, status });
  socket.emit("printer:heartbeat", status);
});

// 7. Handle System Ports List request from server
socket.on("printer:list-ports", async (data, callback) => {
  printerLogger.info("🔍 [Agent] Listing local serial ports...");
  const ports = await SerialPrinter.listPorts();
  if (typeof callback === "function") callback({ success: true, ports });
  else socket.emit("printer:ports:response", { success: true, ports });
});

// 8. Handle Network Printer Connection Test request from server
socket.on("printer:network-test", async (data, callback) => {
  const { ip, port } = data || {};
  printerLogger.info(`🌐 [Agent] Testing network printer connection: ${ip}:${port || 9100}...`);
  const result = await NetworkPrinter.testConnection(ip, port);
  if (typeof callback === "function") callback(result);
});

// Handle Process Exit Signals cleanly
process.on("SIGINT", () => {
  printerLogger.warn("⚠️ Stopping Printer Agent (SIGINT)...");
  socket.disconnect();
  process.exit(0);
});

process.on("SIGTERM", () => {
  printerLogger.warn("⚠️ Stopping Printer Agent (SIGTERM)...");
  socket.disconnect();
  process.exit(0);
});
