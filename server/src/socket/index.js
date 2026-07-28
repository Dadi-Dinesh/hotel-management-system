/**
 * Socket.IO Server Setup — Nookambika Dhaba
 *
 * Room Architecture:
 *   - waiters  : Captain / Waiter dashboards
 *   - captains : Captain / Waiter dashboards (alias)
 *   - admins   : Admin dashboard
 *   - tableCode: Customer table room (e.g. T01 or table:T01)
 *   - printer-agents : Cloud Printer Agent connection room
 */

const cloudPrinterGateway = require("../services/printer/cloudPrinterGateway");

let io;

const initializeSocket = (server, allowedOrigins = []) => {
  const { Server } = require("socket.io");

  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://hotel-management-system-psi-kohl.vercel.app",
    ...allowedOrigins,
  ];

  io = new Server(server, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["polling", "websocket"],
    pingTimeout: 20000,
    pingInterval: 25000,
    connectTimeout: 45000,
    allowEIO3: true,
  });

  io.engine.on("connection_error", (err) => {
    console.warn("⚠️ [Socket Engine] Connection notice:", err.req?.url, err.code, err.message);
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ─────────────────────────────────────────
    // PRINTER AGENT AUTHENTICATION & CONNECTION
    // ─────────────────────────────────────────
    const authApiKey = socket.handshake.auth?.apiKey;
    const isPrinterAgent = socket.handshake.auth?.agentType === "PRINTER_AGENT" || !!authApiKey;

    if (isPrinterAgent) {
      const expectedKey = process.env.PRINTER_AGENT_KEY || "nookambika_printer_secret_key_2026";
      if (authApiKey !== expectedKey) {
        console.error(`❌ [Socket Auth] Unauthorized Printer Agent attempt (Socket ID: ${socket.id}). Disconnecting.`);
        socket.disconnect(true);
        return;
      }

      console.log(`🖨️ [Socket Auth] Printer Agent Authenticated Successfully (Socket ID: ${socket.id})`);
      socket.join("printer-agents");
      cloudPrinterGateway.registerAgent(socket);

      socket.on("printer:agent:connect", (payload) => {
        cloudPrinterGateway.registerAgent(socket, payload);
      });

      socket.on("printer:heartbeat", (payload) => {
        cloudPrinterGateway.updateStatus(payload);
      });

      socket.on("print:ack", (ackPayload) => {
        cloudPrinterGateway.handleJobAck(ackPayload);
      });

      socket.on("disconnect", (reason) => {
        cloudPrinterGateway.unregisterAgent(socket.id);
        console.log("Printer Agent disconnected:", socket.id, "reason:", reason);
      });

      return;
    }

    // ─────────────────────────────────────────
    // ROOM JOINS
    // ─────────────────────────────────────────

    // Customer joins table room
    socket.on("join-table", (tableCode) => {
      if (!tableCode) return;
      const code = tableCode.toUpperCase();
      socket.join(code);
      socket.join(`table:${code}`);
      console.log(`📍 Socket ${socket.id} joined table room: ${code}`);
    });

    // Waiter / Captain joins waiters room
    socket.on("join-waiter", () => {
      socket.join("waiters");
      socket.join("captains");
      console.log(`👨‍🍳 Socket ${socket.id} joined waiters room`);
    });

    socket.on("join-captain", () => {
      socket.join("captains");
      socket.join("waiters");
      console.log(`👨‍🍳 Socket ${socket.id} joined waiters room`);
    });

    // Admin joins admin room
    socket.on("join-admin", () => {
      socket.join("admins");
      socket.join("waiters");
      console.log(`🔑 Socket ${socket.id} joined admins room`);
    });

    // Kitchen staff joins kitchen room
    socket.on("join-kitchen", () => {
      socket.join("kitchen");
      console.log(`👨‍🍳 Socket ${socket.id} joined kitchen room`);
    });

    // ─────────────────────────────────────────
    // KITCHEN LIVE MODE EVENT
    // ─────────────────────────────────────────
    socket.on("kitchen-live-mode", (payload) => {
      const isLive = typeof payload === "boolean" ? payload : !!payload?.enabled;
      console.log(`🔥 Kitchen Live Mode changed: ${isLive ? "ON" : "OFF"}`);
      io.to("kitchen").emit("kitchen-live-mode-changed", { enabled: isLive });
      io.to("captains").emit("kitchen-live-mode-changed", { enabled: isLive });
      io.to("waiters").emit("kitchen-live-mode-changed", { enabled: isLive });
      io.to("admins").emit("kitchen-live-mode-changed", { enabled: isLive });
    });

    // ─────────────────────────────────────────
    // CUSTOMER → WAITER EVENTS
    // ─────────────────────────────────────────

    socket.on("call-waiter", (tableCode) => {
      if (!tableCode) return;

      const payload = {
        tableCode: tableCode.toUpperCase(),
        message: `Table ${tableCode.toUpperCase()} needs assistance`,
        timestamp: new Date().toISOString(),
      };

      console.log(`🔔 Waiter call from Table ${tableCode}`);

      // Emit to waiters, captains, and admins rooms
      io.to("waiters").emit("waiter-call", payload);
      io.to("captains").emit("waiter-call", payload);
      io.to("admins").emit("waiter-call", payload);
    });

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, "reason:", reason);
    });
  });

  console.log("📡 Socket.IO server initialized successfully");
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket(server) first.");
  }
  return io;
};

module.exports = { initializeSocket, getIO };
