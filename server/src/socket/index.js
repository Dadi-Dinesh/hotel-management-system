/**
 * Socket.IO Server Setup — ServeSync
 *
 * Room Architecture (Phase 6 — multi-tenant):
 *   - restaurant:<id>:waiters   : Captain / Waiter dashboards for one restaurant
 *   - restaurant:<id>:captains  : alias of the above
 *   - restaurant:<id>:admins    : Admin dashboard for one restaurant
 *   - restaurant:<id>:kitchen   : Kitchen display for one restaurant
 *   - restaurant:<id>:table:<code> : Customer table room, tenant-scoped
 * Legacy demo URLs join the same verified, tenant-scoped table rooms.
 *   - printer-agents : Cloud Printer Agent connection room (unchanged)
 */

const jwt = require("jsonwebtoken");
const { verifyCustomerAccess } = require("../services/customerAccess");
const { installBroadcastAccess } = require("../services/socketBroadcastAccess");
const { staffSocketAccess, revalidateSocket } = require("../services/staffSocketAccess");
const { supplyRequest } = require("../utils/supplyRequest");
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

  installBroadcastAccess(io.sockets.adapter, revalidateSocket);

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
      const expectedKey = process.env.PRINTER_AGENT_KEY ? process.env.PRINTER_AGENT_KEY.trim() : null;
      if (!expectedKey) {
        console.error(`❌ [Socket Auth] PRINTER_AGENT_KEY is not configured on the server. Rejecting printer agent connection (Socket ID: ${socket.id}).`);
        socket.disconnect(true);
        return;
      }
      if (!authApiKey || authApiKey !== expectedKey) {
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

    // Never accept a room name/tenant as proof of identity. A socket has one
    // current customer or staff context; switching clears prior tenant rooms.
    let joinVersion = 0;
    let accessExpiry;
    const clearRooms = () => {
      for (const room of socket.rooms || []) if (room !== socket.id) socket.leave(room);
      delete socket.data.restaurantId;
      delete socket.data.tableCode;
      delete socket.data.customerAccess;
      delete socket.data.staff;
      clearTimeout(accessExpiry);
    };
    const expireWith = (token) => {
      const expiry = jwt.decode(token)?.exp;
      if (expiry) {
        accessExpiry = setTimeout(() => { clearRooms(); socket.disconnect(true); }, Math.max(0, expiry * 1000 - Date.now()));
        accessExpiry.unref?.();
      }
    };
    socket.on("join-table", async (payload, acknowledge) => {
      const version = ++joinVersion;
      const reply = typeof acknowledge === "function" ? acknowledge : () => {};
      try {
        const context = await verifyCustomerAccess(payload?.customerAccess);
        const { table, restaurant } = context;
        const slug = payload?.restaurantSlug ?? "nookambika";
        if (typeof payload?.tableCode !== "string" || table.code !== payload.tableCode.toUpperCase() || restaurant.slug !== slug) throw new Error("Invalid table context.");
        if (version !== joinVersion) return;
        clearRooms();
        socket.data.restaurantId = restaurant.id;
        socket.data.tableCode = table.code;
        socket.data.customerAccess = payload.customerAccess;
        socket.join(`restaurant:${restaurant.id}:table:${table.code}`);
        // Legacy URLs use this same verified, tenant-scoped room.
        expireWith(payload.customerAccess);
        reply({ success: true });
      } catch { reply({ success: false, message: "Scan this table's QR code again." }); }
    });
    const joinStaff = (event, roles, rooms) => socket.on(event, async (payload, acknowledge) => {
      const version = ++joinVersion;
      const reply = typeof acknowledge === "function" ? acknowledge : () => {};
      try {
        const token = payload?.token || socket.handshake.auth?.token;
        const staff = await staffSocketAccess(token, payload?.restaurantId, roles);
        if (version !== joinVersion) return;
        clearRooms();
        socket.data.restaurantId = staff.restaurantId;
        socket.data.staff = { ...staff, token, roles };
        rooms.forEach(role => socket.join(`restaurant:${staff.restaurantId}:${role}`));
        expireWith(token);
        reply({ success: true });
      } catch { reply({ success: false, message: "Staff access denied." }); }
    });
    joinStaff("join-waiter", ["CAPTAIN", "MANAGER", "ADMIN"], ["waiters", "captains"]);
    joinStaff("join-captain", ["CAPTAIN", "MANAGER", "ADMIN"], ["waiters", "captains"]);
    joinStaff("join-admin", ["ADMIN"], ["admins", "waiters"]);
    joinStaff("join-kitchen", ["KITCHEN", "ADMIN"], ["kitchen"]);

    socket.on("join-platform", async (payload) => {
      const version = ++joinVersion;
      try {
        if (!process.env.JWT_SECRET) return;
        const { authenticate } = require("../middleware/auth");
        const req = { headers: { authorization: `Bearer ${payload?.token || ""}` } };
        let valid = false;
        await authenticate(req, { status() { return this; }, json() {} }, () => { valid = true; });
        if (!valid || req.user.role !== "ADMIN" || req.user.restaurantId) return;
        if (version !== joinVersion) return;
        clearRooms();
        socket.data.staff = { platform: true, token: payload.token };
        socket.join("platform:admins");
        expireWith(payload.token);
      } catch { /* Invalid credentials never join. */ }
    });
    socket.on("kitchen-live-mode", async (payload) => {
      try {
        const current = socket.data.staff;
        if (!current) return;
        const staff = await staffSocketAccess(current.token, current.restaurantId, ["ADMIN", "CAPTAIN", "MANAGER"]);
        if (payload?.restaurantId && payload.restaurantId !== staff.restaurantId) return;
        const enabled = typeof payload === "boolean" ? payload : !!payload?.enabled;
        io.to(["kitchen", "captains", "waiters", "admins"].map(role => `restaurant:${staff.restaurantId}:${role}`)).emit("kitchen-live-mode-changed", { enabled });
      } catch { /* Unauthorized state changes are ignored. */ }
    });

    socket.on("call-waiter", async (data, acknowledge) => {
      const reply = typeof acknowledge === "function" ? acknowledge : () => {};
      try {
        const { table, restaurant } = await verifyCustomerAccess(socket.data.customerAccess);
        const tableCode = typeof data === "string" ? data : data?.tableCode;
        if (typeof tableCode !== "string" || table.code !== tableCode.toUpperCase()) throw new Error("Invalid table.");
        const request = supplyRequest(data);
        const rooms = ["waiters", "captains", "admins"].map(role => `restaurant:${restaurant.id}:${role}`);
        if (!rooms.some(room => io.sockets.adapter.rooms.get(room)?.size > 0)) {
          reply({ success: false, message: "No staff connection is available. Please ask staff directly." });
          return;
        }
        const delivered = await io.sockets.adapter.broadcast({ type: 2, nsp: "/", data: ["waiter-call", {
          tableCode: table.code, ...request, timestamp: new Date().toISOString(),
        }] }, { rooms: new Set(rooms), except: new Set(), flags: {} });
        reply({ success: delivered > 0, acknowledgement: "server-dispatch", message: delivered > 0 ? undefined : "No authorized staff connection is available. Please ask staff directly." });
      } catch { reply({ success: false, message: "Request could not be dispatched. Scan the QR code or ask staff directly." }); }
    });

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────

    socket.on("disconnect", (reason) => {
      clearTimeout(accessExpiry);
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
