/**
 * Socket.IO server setup for real-time communication
 */

let io;

const initializeSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join table-specific room (for customers)
    socket.on("join-table", (tableCode) => {
      socket.join(`table-${tableCode}`);
      console.log(`Socket ${socket.id} joined table-${tableCode}`);
    });

    // Join captain room
    socket.on("join-captain", () => {
      socket.join("captains");
      console.log(`Socket ${socket.id} joined captains room`);
    });

    // Join admin room
    socket.on("join-admin", () => {
      socket.join("admins");
      console.log(`Socket ${socket.id} joined admins room`);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

module.exports = { initializeSocket, getIO };
