const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/authRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const adminRoutes = require("./routes/adminRoutes");
require("dotenv").config();

const connectDB = require("./config/db");

// Validate critical environment variables on startup
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set.");
  process.exit(1);
}

if (process.env.JWT_SECRET === "your_super_secret_key") {
  console.warn(
    "WARNING: JWT_SECRET is using the default placeholder. " +
    "Set a strong random secret in production."
  );
}

const app = express();

// ── Security: HTTP headers ─────────────────────────────────────────────────
app.use(helmet());

// ── Security: CORS ─────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Security: Rate limiting ────────────────────────────────────────────────
// Strict limiter for authentication endpoints (prevents brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

// General limiter for all other API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

app.use(express.json({ limit: "10kb" })); // Prevent excessively large payloads

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth",         authLimiter,    authRoutes);
app.use("/api/certificates", generalLimiter, certificateRoutes);
app.use("/api/admin",        generalLimiter, adminRoutes);

// ── Health check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Digital Certificate Verification API is running" });
});

app.get("/api/", (req, res) => {
  res.json({ message: "Digital Certificate Verification API is running" });
});

// ── Start server ───────────────────────────────────────────────────────────
if (require.main === module) {
  connectDB()
    .then(() => {
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to start server:", error.message);
      process.exit(1);
    });
}

module.exports = app;