/**
 * Socket.IO Server Setup — Nookambika Dhaba
 *
 * Room Architecture:
 *   - waiters  : Captain / Waiter dashboards
 *   - captains : Captain / Waiter dashboards (alias)
 *   - admins   : Admin dashboard
 *   - tableCode: Customer table room (e.g. T01 or table:T01)
 */

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
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          defaultOrigins.includes(origin) ||
          origin.endsWith(".vercel.app") ||
          origin.startsWith("http://localhost:")
        ) {
          return callback(null, true);
        }
        return callback(new Error(`Socket CORS: origin ${origin} not allowed`));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

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
