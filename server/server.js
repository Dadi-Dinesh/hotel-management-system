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
const PORT = process.env.PORT || 4000;

// Initialize Socket.IO
initializeSocket(server);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Nookambika Dhaba API is running 🍛",
    version: "1.0.0",
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
  console.log(`📡 Socket.IO ready for real-time connections`);
  console.log(`🔗 API: http://localhost:${PORT}\n`);
});