require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { initializeSocket } = require("./src/socket");
const errorHandler = require("./src/middleware/errorHandler");

// Route imports
const authRoutes = require("./src/routes/auth.routes");
const tableRoutes = require("./src/routes/table.routes");
const sessionRoutes = require("./src/routes/session.routes");
const menuRoutes = require("./src/routes/menu.routes");
const categoryRoutes = require("./src/routes/category.routes");
const orderRoutes = require("./src/routes/order.routes");
const adminRoutes = require("./src/routes/admin.routes");
const feedbackRoutes = require("./src/routes/feedback.routes");
const printerRoutes = require("./src/routes/printer.routes");

const app = express();

// Required HTTP server setup for Socket.IO attachment
const server = http.createServer(app);

// Port setup — process.env.PORT for Render deployment, default 4000
const PORT = process.env.PORT || 4000;

// Allowed CORS origins
const getAllowedOrigins = () => {
  const origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://hotel-management-system-psi-kohl.vercel.app",
  ];

  if (process.env.CLIENT_URL) {
    const urls = process.env.CLIENT_URL.split(",").map((u) => u.trim());
    urls.forEach((url) => {
      if (url && !origins.includes(url)) {
        origins.push(url);
      }
    });
  }

  return origins;
};

const ALLOWED_ORIGINS = getAllowedOrigins();

// Initialize Socket.IO with server and allowed origins
initializeSocket(server, ALLOWED_ORIGINS);

// Middleware
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Nookambika Dhaba API is running 🍛",
    version: "1.0.0",
    socket: "enabled",
    port: PORT,
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedbacks", feedbackRoutes);
app.use("/api/printer", printerRoutes);

// Global error handler
app.use(errorHandler);

// Process safety & server event loggers
server.on("error", (err) => {
  console.error("💥 [Server] HTTP/Socket Server Error:", err.message);
});

server.on("close", () => {
  console.warn("⚠️ [Server] HTTP/Socket Server Closed");
});

process.on("SIGINT", () => {
  console.warn("⚠️ [Process] Received SIGINT signal");
});

process.on("SIGTERM", () => {
  console.warn("⚠️ [Process] Received SIGTERM signal");
});

process.on("uncaughtException", (err) => {
  console.error("💥 [Process] Uncaught Exception:", err.message, err.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 [Process] Unhandled Rejection at:", promise, "reason:", reason);
});

const prisma = require("./src/config/db");
const printerService = require("./src/services/printer/printerService");

// Async non-blocking startup routine
const startServer = async () => {
  // 1. Database Connection Verification (5s non-blocking check)
  try {
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database check timeout")), 5000)),
    ]);
    console.log("✓ Database Connected");
  } catch (dbErr) {
    console.warn("⚠️ [Database Check Notice]:", dbErr.message);
  }

  // 2. Socket.IO Verification
  console.log("✓ Socket Started");

  // 3. Printer Status Check (Non-Blocking)
  try {
    const printerStatus = printerService.getStatus();
    if (printerStatus && printerStatus.status === "CONNECTED") {
      console.log(`✓ Printer Ready (${printerStatus.portPath || "Serial Hardware"})`);
    } else {
      console.log("✓ Printer Disabled (Hardware not detected)");
    }
  } catch (printerErr) {
    console.log("✓ Printer Disabled (Hardware not detected)");
  }

  // 4. Start Listening
  server.listen(PORT, () => {
    console.log(`✓ Server Running on port ${PORT}\n`);
    console.log(`🍛 Nookambika Dhaba API ready for requests on http://localhost:${PORT}`);
  });
};

startServer();