const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const sensorDataRoutes = require("./routes/sensorData.routes");
const authRoutes = require("./routes/auth.routes");
const alarmRoutes = require("./routes/alarm.routes");
const adminRoutes = require("./routes/admin.routes");
const emergencyContactRoutes = require("./routes/emergencyContact.routes");

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["*"];
const corsOptions = {
  origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
};
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(apiLimiter);
app.use(express.json());
app.use("/api/sensor-data", sensorDataRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/alarms", alarmRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/emergency-contacts", emergencyContactRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Fall Detection Backend API is running",
    status: "success",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "fall-detection-backend",
    timestamp: new Date(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "fall-detection-backend",
    timestamp: new Date(),
  });
});

module.exports = app;
