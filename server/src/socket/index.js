/**
 * Socket.IO Server Setup — ServeSync
 *
 * Room Architecture (Phase 6 — multi-tenant):
 *   - restaurant:<id>:waiters   : Captain / Waiter dashboards for one restaurant
 *   - restaurant:<id>:captains  : alias of the above
 *   - restaurant:<id>:admins    : Admin dashboard for one restaurant
 *   - restaurant:<id>:kitchen   : Kitchen display for one restaurant
 *   - restaurant:<id>:table:<code> : Customer table room, tenant-scoped
 *   - tableCode / table:<code> : legacy, un-scoped table rooms — kept ALIVE
 *     alongside the scoped ones so pre-existing (un-prefixed) customer pages
 *     keep working exactly as before. Only ever used by the demo restaurant,
 *     since legacy pages can only ever resolve a demo-restaurant table in the
 *     first place (see middleware/tenant.js resolvePublicTenant) — so there is
 *     no cross-tenant collision risk in keeping them.
 *   - printer-agents : Cloud Printer Agent connection room (unchanged)
 */

const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const cloudPrinterGateway = require("../services/printer/cloudPrinterGateway");

let io;
let cachedDemoRestaurantId = null;

async function resolveDemoRestaurantId() {
  if (cachedDemoRestaurantId) return cachedDemoRestaurantId;
  const demo = await prisma.restaurant.findUnique({ where: { slug: "nookambika" }, select: { id: true } });
  cachedDemoRestaurantId = demo?.id || null;
  return cachedDemoRestaurantId;
}

/** Resolve a restaurantId from an explicit slug, falling back to the demo restaurant. */
async function resolveRestaurantId(restaurantSlug) {
  if (restaurantSlug) {
    const restaurant = await prisma.restaurant.findUnique({ where: { slug: restaurantSlug }, select: { id: true } });
    if (restaurant) return restaurant.id;
  }
  return resolveDemoRestaurantId();
}

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

    // Customer joins table room. Accepts either:
    //   "T01"                                  — legacy, resolves to the demo restaurant
    //   { tableCode: "T01", restaurantSlug }    — new, tenant-scoped
    socket.on("join-table", async (payload) => {
      try {
        const tableCode = typeof payload === "string" ? payload : payload?.tableCode;
        const restaurantSlug = typeof payload === "object" ? payload?.restaurantSlug : undefined;
        if (!tableCode) return;

        const code = tableCode.toUpperCase();
        const restaurantId = await resolveRestaurantId(restaurantSlug);

        socket.data.restaurantId = restaurantId;
        socket.data.tableCode = code;

        // Legacy rooms — always joined so existing demo-restaurant pages keep working.
        socket.join(code);
        socket.join(`table:${code}`);
        // Tenant-scoped room — what every new emit targets.
        if (restaurantId) {
          socket.join(`restaurant:${restaurantId}:table:${code}`);
        }
        console.log(`📍 Socket ${socket.id} joined table room: ${code} (restaurant: ${restaurantId || "unknown"})`);
      } catch (err) {
        console.error("join-table error:", err.message);
      }
    });

    // Waiter / Captain joins waiters room. Accepts an optional { restaurantId }.
    socket.on("join-waiter", async (payload) => {
      const restaurantId = payload?.restaurantId || (await resolveDemoRestaurantId());
      socket.data.restaurantId = restaurantId;
      socket.join(`restaurant:${restaurantId}:waiters`);
      socket.join(`restaurant:${restaurantId}:captains`);
      console.log(`👨‍🍳 Socket ${socket.id} joined waiters room (restaurant: ${restaurantId})`);
    });

    socket.on("join-captain", async (payload) => {
      const restaurantId = payload?.restaurantId || (await resolveDemoRestaurantId());
      socket.data.restaurantId = restaurantId;
      socket.join(`restaurant:${restaurantId}:captains`);
      socket.join(`restaurant:${restaurantId}:waiters`);
      console.log(`👨‍🍳 Socket ${socket.id} joined captains room (restaurant: ${restaurantId})`);
    });

    // Admin joins admin room. Platform Owners pass no restaurantId until they
    // pick one via the RestaurantSwitcher, which re-emits join-admin.
    socket.on("join-admin", async (payload) => {
      const restaurantId = payload?.restaurantId || (await resolveDemoRestaurantId());
      socket.data.restaurantId = restaurantId;
      if (restaurantId) {
        socket.join(`restaurant:${restaurantId}:admins`);
        socket.join(`restaurant:${restaurantId}:waiters`);
      }
      console.log(`🔑 Socket ${socket.id} joined admins room (restaurant: ${restaurantId || "platform-wide"})`);
    });

    // Platform Owner joins platform:admins room for real-time application
    // notifications. Requires a valid Platform Owner JWT — the room carries
    // applicant contact details, so it is never joinable anonymously.
    socket.on("join-platform", async (payload) => {
      try {
        const token = payload?.token;
        if (!token) return;
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "nookambika-dhaba-jwt-secret-2024-secure");
        const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { restaurantId: true } });
        if (!user || user.restaurantId) return;
        socket.join("platform:admins");
        console.log(`🛡️ Socket ${socket.id} joined platform:admins room`);
      } catch (e) {
        // Invalid/expired token — silently refuse the room.
      }
    });

    // Kitchen staff joins kitchen room.
    socket.on("join-kitchen", async (payload) => {
      const restaurantId = payload?.restaurantId || (await resolveDemoRestaurantId());
      socket.data.restaurantId = restaurantId;
      socket.join(`restaurant:${restaurantId}:kitchen`);
      console.log(`👨‍🍳 Socket ${socket.id} joined kitchen room (restaurant: ${restaurantId})`);
    });

    // ─────────────────────────────────────────
    // KITCHEN LIVE MODE EVENT
    // ─────────────────────────────────────────
    socket.on("kitchen-live-mode", (payload) => {
      const isLive = typeof payload === "boolean" ? payload : !!payload?.enabled;
      const restaurantId = (typeof payload === "object" && payload?.restaurantId) || socket.data.restaurantId;
      if (!restaurantId) return;
      console.log(`🔥 Kitchen Live Mode changed: ${isLive ? "ON" : "OFF"} (restaurant: ${restaurantId})`);
      io.to(`restaurant:${restaurantId}:kitchen`).emit("kitchen-live-mode-changed", { enabled: isLive });
      io.to(`restaurant:${restaurantId}:captains`).emit("kitchen-live-mode-changed", { enabled: isLive });
      io.to(`restaurant:${restaurantId}:waiters`).emit("kitchen-live-mode-changed", { enabled: isLive });
      io.to(`restaurant:${restaurantId}:admins`).emit("kitchen-live-mode-changed", { enabled: isLive });
    });

    // ─────────────────────────────────────────
    // CUSTOMER → WAITER EVENTS
    // ─────────────────────────────────────────

    socket.on("call-waiter", (data) => {
      const tableCode = typeof data === "string" ? data : data?.tableCode;
      if (!tableCode) return;

      const customMessage =
        typeof data === "object" && data?.message
          ? data.message
          : `Table ${tableCode.toUpperCase()} needs assistance`;

      const payload = {
        tableCode: tableCode.toUpperCase(),
        message: customMessage,
        details: typeof data === "object" ? data.details || null : null,
        timestamp: new Date().toISOString(),
      };

      console.log(`🔔 Waiter call from Table ${tableCode}: ${customMessage}`);

      // Tenant-scoped only — resolved from this socket's own join-table call,
      // which defaults to the demo restaurant when no slug was given. Every
      // staff dashboard (old or new) joins that same restaurant-scoped room
      // by default, so this reaches the right — and only the right — staff.
      const restaurantId = socket.data.restaurantId;
      if (restaurantId) {
        io.to(`restaurant:${restaurantId}:waiters`).emit("waiter-call", payload);
        io.to(`restaurant:${restaurantId}:captains`).emit("waiter-call", payload);
        io.to(`restaurant:${restaurantId}:admins`).emit("waiter-call", payload);
      }
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
