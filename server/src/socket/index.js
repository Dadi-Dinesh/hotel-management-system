/**
 * Socket.IO Server — Nookambika Dhaba
 *
 * Room Architecture:
 *   table:<CODE>  → Customers at a specific table (e.g., table:T01)
 *   captains      → All logged-in captain/waiter dashboards
 *   admins        → All logged-in admin dashboards
 *
 * Event Flow:
 *   Customer  → join-table(code)     → joins room table:<CODE>
 *   Customer  → call-waiter(code)    → emits waiter-call to captains + admins
 *   Server    → new-order            → captains + admins rooms
 *   Server    → order-accepted       → table:<CODE> room
 *   Server    → order-status-update  → table:<CODE> room + admins
 *   Server    → bill-requested       → captains + admins rooms
 *   Server    → session-closed       → table:<CODE> room
 *   Server    → new-session          → captains + admins rooms
 */

let io;

const initializeSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    // Support both WebSocket and HTTP long-polling.
    // Polling is the fallback when raw WebSocket upgrades are blocked
    // by a reverse proxy (common on Render's free tier).
    transports: ["polling", "websocket"],

    cors: {
      // Must be explicit — "origin: true" fails with credentials on some proxies
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    },

    // Increase ping/pong timeouts for Render's cold-start latency
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id} [${socket.handshake.address}]`);

    // ─────────────────────────────────────────
    // ROOM JOINS
    // ─────────────────────────────────────────

    /**
     * Customer joins their table room.
     * Called when customer opens /table/[code] or /table/[code]/menu or /orders.
     * Room name: table:<CODE> e.g., table:T01
     */
    socket.on("join-table", (tableCode) => {
      if (!tableCode) return;
      const room = `table:${tableCode.toUpperCase()}`;
      socket.join(room);
      console.log(`📍 Socket ${socket.id} joined room: ${room}`);
    });

    /**
     * Captain/waiter joins the captains room.
     * Called when captain opens their dashboard.
     */
    socket.on("join-captain", () => {
      socket.join("captains");
      console.log(`👨‍🍳 Socket ${socket.id} joined captains room`);
    });

    /**
     * Admin joins the admins room.
     * Called when admin opens their dashboard.
     */
    socket.on("join-admin", () => {
      socket.join("admins");
      console.log(`🔑 Socket ${socket.id} joined admins room`);
    });

    // ─────────────────────────────────────────
    // CUSTOMER → WAITER EVENTS
    // ─────────────────────────────────────────

    /**
     * Customer calls waiter from their table.
     * Emits "waiter-call" to captains and admins rooms instantly.
     * Payload: { tableCode, timestamp }
     */
    socket.on("call-waiter", (tableCode) => {
      if (!tableCode) return;

      const payload = {
        tableCode: tableCode.toUpperCase(),
        message: `Table ${tableCode.toUpperCase()} needs assistance`,
        timestamp: new Date().toISOString(),
      };

      // Notify all captains and admins
      io.to("captains").emit("waiter-call", payload);
      io.to("admins").emit("waiter-call", payload);

      console.log(`🔔 Waiter called from Table ${tableCode}`);
    });

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────

    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} — Reason: ${reason}`);
    });

    socket.on("connect_error", (err) => {
      console.error(`Socket connect error: ${err.message}`);
    });
  });

  console.log("📡 Socket.IO initialized successfully");
  return io;
};

/**
 * Get the initialized Socket.IO instance.
 * Used by controllers to emit events after DB operations.
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket(server) first.");
  }
  return io;
};

module.exports = { initializeSocket, getIO };
