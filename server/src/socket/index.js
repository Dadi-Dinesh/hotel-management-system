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
 *
 * WHY transports: ["websocket", "polling"]:
 *   Server supports BOTH — client uses websocket only but server must
 *   accept polling too for the Socket.IO handshake health check endpoint:
 *   /socket.io/?EIO=4&transport=polling
 *   This endpoint is used by monitoring tools and browser pre-flight checks.
 */

let io;

/**
 * Initialize Socket.IO server.
 *
 * @param {http.Server} server - The Node.js HTTP server
 * @param {string[]} allowedOrigins - Array of allowed CORS origins
 */
const initializeSocket = (server, allowedOrigins) => {
  const { Server } = require("socket.io");

  // Build the CORS origin checker — same logic as Express CORS middleware
  const originChecker = (origin, callback) => {
    // Allow no-origin requests (server-to-server, mobile apps, curl)
    if (!origin) return callback(null, true);

    // Allow exact match
    if (allowedOrigins && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow any Vercel preview deployment URL
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    // Allow localhost on any port for local dev
    if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
      return callback(null, true);
    }

    console.warn(`⛔ Socket.IO CORS blocked: ${origin}`);
    return callback(new Error(`CORS not allowed for origin: ${origin}`));
  };

  io = new Server(server, {
    // ── Transport Configuration ───────────────────────────────────────
    // Server accepts both transports so the /socket.io/ health check
    // endpoint works via polling (useful for uptime monitoring).
    //
    // The client is configured to use "websocket" only, which means:
    //  1. Client skips the polling handshake (fixes "xhr poll error")
    //  2. Server still accepts polling for monitoring/compatibility
    transports: ["websocket", "polling"],

    // Allow WebSocket upgrade from polling if client requests it
    allowUpgrades: true,

    cors: {
      origin: originChecker,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    },

    // ── Timing tuned for Render's free tier cold-start latency ────────
    pingTimeout: 60000,     // 60s — wait longer before declaring dead
    pingInterval: 25000,    // 25s — keep-alive interval
    connectTimeout: 45000,  // 45s — time to complete handshake
  });

  io.on("connection", (socket) => {
    const transport = socket.conn.transport.name; // "websocket" or "polling"
    const origin = socket.handshake.headers.origin || "no-origin";
    console.log(`✅ Socket connected: ${socket.id} | transport: ${transport} | origin: ${origin}`);

    // Track transport upgrades (polling → websocket)
    socket.conn.on("upgrade", (newTransport) => {
      console.log(`⬆️  Socket ${socket.id} upgraded to: ${newTransport.name}`);
    });

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
      console.log(`📍 Socket ${socket.id} → joined room: ${room}`);
    });

    /**
     * Captain/waiter joins the captains room.
     * Called when captain opens their dashboard.
     */
    socket.on("join-captain", () => {
      socket.join("captains");
      console.log(`👨‍🍳 Socket ${socket.id} → joined captains room`);
    });

    /**
     * Admin joins the admins room.
     * Called when admin opens their dashboard.
     */
    socket.on("join-admin", () => {
      socket.join("admins");
      console.log(`🔑 Socket ${socket.id} → joined admins room`);
    });

    // ─────────────────────────────────────────
    // CUSTOMER → WAITER EVENTS
    // ─────────────────────────────────────────

    /**
     * Customer calls waiter from their table.
     * Emits "waiter-call" to captains and admins rooms instantly.
     * Payload: { tableCode, message, timestamp }
     */
    socket.on("call-waiter", (tableCode) => {
      if (!tableCode) return;

      const payload = {
        tableCode: tableCode.toUpperCase(),
        message: `Table ${tableCode.toUpperCase()} needs assistance`,
        timestamp: new Date().toISOString(),
      };

      // Notify all captains and admins simultaneously
      io.to("captains").emit("waiter-call", payload);
      io.to("admins").emit("waiter-call", payload);

      console.log(`🔔 Waiter called from Table ${tableCode} → broadcast to captains + admins`);
    });

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────

    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} — reason: ${reason}`);
    });

    // Note: connect_error is a client-side event, not emitted on the socket object
    // Server-side errors are logged via the CORS callback above
  });

  // Log when engine has an error
  io.engine.on("connection_error", (err) => {
    console.error("🚨 Socket.IO engine error:", {
      code: err.code,
      message: err.message,
      context: err.context,
    });
  });

  console.log("📡 Socket.IO initialized | transports: [websocket, polling] | CORS: dynamic origin check");
  return io;
};

/**
 * Get the initialized Socket.IO instance.
 * Used by controllers to emit events after DB operations.
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket(server, origins) first.");
  }
  return io;
};

module.exports = { initializeSocket, getIO };
