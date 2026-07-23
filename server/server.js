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

const app = express();
const server = http.createServer(app);

// Render always injects PORT dynamically — 8080 is the safe fallback
const PORT = process.env.PORT || 8080;

// ── CORS Origins ────────────────────────────────────────────────────────────
// Always allow localhost for local development.
// In production, CLIENT_URL must be set on Render to your Vercel domain.
// We support BOTH as an array so neither blocks the other.
const getAllowedOrigins = () => {
  const origins = [
    "http://localhost:3000",   // local Next.js dev server
    "http://localhost:3001",   // alternate local port
  ];

  // Append production Vercel domain from environment variable
  if (process.env.CLIENT_URL) {
    // CLIENT_URL may be a comma-separated list for multi-environment support
    const clientUrls = process.env.CLIENT_URL.split(",").map((u) => u.trim());
    origins.push(...clientUrls);
  }

  // Always include the known Vercel deployment URL as a hard-coded safety net
  // so even if CLIENT_URL is misconfigured on Render, it still works
  const VERCEL_URL = "https://hotel-management-system-psi-kohl.vercel.app";
  if (!origins.includes(VERCEL_URL)) {
    origins.push(VERCEL_URL);
  }

  console.log("🌐 CORS allowed origins:", origins);
  return origins;
};

const ALLOWED_ORIGINS = getAllowedOrigins();

// Initialize Socket.IO BEFORE Express middleware
// (Socket.IO needs to attach to the raw http server)
initializeSocket(server, ALLOWED_ORIGINS);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, mobile apps, curl)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      // Also allow any Vercel preview deployments (branch deploys)
      if (origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      console.warn(`⛔ CORS blocked origin: ${origin}`);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check — also verifies Socket.IO endpoint reachability
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

// Global error handler
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`\n🍛 Nookambika Dhaba server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready — transports: [websocket, polling]`);
  console.log(`🔗 Health: http://localhost:${PORT}`);
  console.log(`🔗 Socket test: http://localhost:${PORT}/socket.io/?EIO=4&transport=polling\n`);
});