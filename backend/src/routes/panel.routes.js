const express = require("express");
const SensorData = require("../models/SensorData");
const Alarm = require("../models/Alarm");
const { protect, adminOnly } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/stats", async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalAlarms, unresolvedAlarms, todayFalls, totalSensorRecords] =
      await Promise.all([
        Alarm.countDocuments({ userId }),
        Alarm.countDocuments({ userId, isResolved: false }),
        SensorData.countDocuments({
          userId,
          isFallDetected: true,
          timestamp: { $gte: startOfToday },
        }),
        SensorData.countDocuments({ userId }),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        totalAlarms,
        unresolvedAlarms,
        todayFalls,
        totalSensorRecords,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching panel stats",
      error: error.message,
    });
  }
});

router.get("/recent-alarms", async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const alarms = await Alarm.find({ userId })
      .populate("sensorDataId")
      .sort({ isResolved: 1, createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      count: alarms.length,
      data: alarms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching recent alarms",
      error: error.message,
    });
  }
});

router.get("/sensor-chart", async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const hoursParam = Number.parseInt(req.query.hours, 10);
    const hours = Number.isNaN(hoursParam) ? 1 : Math.min(Math.max(hoursParam, 1), 24);

    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const deviceId = req.query.deviceId;

    const query = {
      userId,
      timestamp: { $gte: fromDate },
    };
    if (deviceId) {
      query.deviceId = deviceId;
    }

    const points = await SensorData.find(query)
      .sort({ timestamp: 1 })
      .select("timestamp accelerometer isFallDetected deviceId");

    return res.status(200).json({
      success: true,
      hours,
      count: points.length,
      data: points,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching sensor chart data",
      error: error.message,
    });
  }
});

router.get("/devices", async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Her cihaz için en son sensör verisinin zaman damgasını, büyüklüğünü ve düşme sayısını al
    const devicesData = await SensorData.aggregate([
      { $match: { userId } },
      { $sort: { timestamp: -1 } }, // Son veriyi alabilmek için önce sırala
      { $group: { 
          _id: "$deviceId", 
          lastSeen: { $first: "$timestamp" },
          magnitude: { $first: "$accelerometer.magnitude" },
          fallCount: {
            $sum: { $cond: [{ $eq: ["$isFallDetected", true] }, 1, 0] }
          }
        } 
      },
      { $sort: { lastSeen: -1 } }
    ]);
    
    const devices = devicesData
      .filter(d => d._id)
      .map(d => ({
        deviceId: d._id,
        lastSeen: d.lastSeen,
        magnitude: d.magnitude || 0,
        fallCount: d.fallCount || 0,
        isOnline: (new Date() - new Date(d.lastSeen)) < 5 * 60 * 1000 // son 5 dakika
      }));

    return res.status(200).json({
      success: true,
      data: devices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching devices",
      error: error.message,
    });
  }
});

module.exports = router;
