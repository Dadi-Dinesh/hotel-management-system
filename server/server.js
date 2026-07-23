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
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
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

// Global error handler
app.use(errorHandler);

// Start server listening on dynamic PORT
server.listen(PORT, () => {
  console.log(`\n🍛 Nookambika Dhaba server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for real-time connections`);
  console.log(`🔗 Allowed origins:`, ALLOWED_ORIGINS);
});