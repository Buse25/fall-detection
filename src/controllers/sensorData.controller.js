const SensorData = require("../models/SensorData");
const Alarm = require("../models/Alarm");
const calculateMagnitude = (accelerometer) => {
  const { x, y, z } = accelerometer;
  return Math.sqrt(x * x + y * y + z * z);
};

const createSensorData = async (req, res) => {
  try {
    const { deviceId, timestamp, accelerometer, gyroscope } = req.body;
    const userId = req.user._id.toString();

    if (!deviceId || !accelerometer || !gyroscope) {
      return res.status(400).json({
        success: false,
        message: "deviceId, accelerometer and gyroscope are required",
      });
    }

    const magnitude = calculateMagnitude(accelerometer);
    const FALL_THRESHOLD = 2.5;
const detectionMethod = "rule-based";
    const isFallDetected = magnitude > FALL_THRESHOLD;
    const fallScore = magnitude;

const sensorData = await SensorData.create({
  userId,
  deviceId,
  timestamp,

  accelerometer: {
    ...accelerometer,
    magnitude,
  },

  gyroscope,
  isFallDetected,
  fallScore,
});

if (isFallDetected) {
  await Alarm.create({
    userId,
    deviceId,
    sensorDataId: sensorData._id,
    alarmType: "fall",
    severity: "high",
    message: "Fall detected by rule-based detection",
  });
}

    return res.status(201).json({
      success: true,
      message: "Sensor data saved successfully",
      data: sensorData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while saving sensor data",
      error: error.message,
    });
  }
};

const getSensorData = async (req, res) => {
  try {
    const sensorData = await SensorData.find()
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: sensorData.length,
      data: sensorData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching sensor data",
      error: error.message,
    });
  }
};
const getLatestSensorData = async (req, res) => {
  try {
    const latestData = await SensorData.findOne().sort({ createdAt: -1 });

    if (!latestData) {
      return res.status(404).json({
        success: false,
        message: "No sensor data found",
      });
    }

    return res.status(200).json({
      success: true,
      data: latestData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching latest sensor data",
      error: error.message,
    });
  }
};
const getFallDetectedData = async (req, res) => {
  try {
    const fallData = await SensorData.find({ isFallDetected: true })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: fallData.length,
      data: fallData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching fall detected data",
      error: error.message,
    });
  }
};

module.exports = {
  createSensorData,
  getSensorData,
  getLatestSensorData,
  getFallDetectedData,
};
