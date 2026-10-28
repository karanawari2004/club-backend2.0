
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const dns = require("dns");

// MongoDB session store
const connectMongo = require("connect-mongo");
const MongoStore =
  connectMongo.MongoStore || connectMongo.default || connectMongo;

// Configure DNS servers
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// Import routes
const loginRoutes = require("./Router/loginRouter");
const AdminRouter = require("./Router/AdminRouter");

const app = express();

const isProd = process.env.NODE_ENV === "production";

// Trust proxy when deployed behind a proxy such as Render
if (isProd) {
  app.set("trust proxy", 1);
}

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Parse incoming JSON
app.use(express.json({ limit: "1mb" }));

// Session configuration
app.use(
  session({
    name: "rizz_session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),

    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

// Login, session and logout routes
app.use("/api", loginRoutes);

// Admin routes
app.use("/api/admin", AdminRouter);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Club Management Backend is running",
  });
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Server port
const PORT = process.env.PORT || 4001;

// Start server
async function startServer() {
  try {
    // Validate environment variables
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    if (!process.env.SESSION_SECRET) {
      throw new Error("SESSION_SECRET is missing from .env");
    }

    if (process.env.SESSION_SECRET.length < 32) {
      throw new Error(
        "SESSION_SECRET must be at least 32 characters long"
      );
    }

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      throw new Error(
        "ADMIN_USERNAME and ADMIN_PASSWORD must be configured"
      );
    }

    if (!allowedOrigins.length) {
      throw new Error("At least one frontend origin must be configured");
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");
    console.log("Database:", mongoose.connection.name);

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
      console.log(`Environment: ${isProd ? "production" : "development"}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

// Start only when this file is executed directly
if (require.main === module) {
  startServer();
}

module.exports = app;