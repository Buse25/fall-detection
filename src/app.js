const express = require("express");
const cors = require("cors");
const sensorDataRoutes = require("./routes/sensorData.routes");
const authRoutes = require("./routes/auth.routes");
const alarmRoutes = require("./routes/alarm.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/sensor-data", sensorDataRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/alarms", alarmRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Fall Detection Backend API is running",
    status: "success",
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