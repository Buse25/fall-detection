const SensorData = require("../models/SensorData");

const calculateMagnitude = (accelerometer) => {
  const { x, y, z } = accelerometer;
  return Math.sqrt(x * x + y * y + z * z);
};

const createSensorData = async (req, res) => {
  try {
    const { userId, deviceId, timestamp, accelerometer, gyroscope } = req.body;

    if (!userId || !deviceId || !accelerometer || !gyroscope) {
      return res.status(400).json({
        success: false,
        message: "userId, deviceId, accelerometer and gyroscope are required",
      });
    }

    const magnitude = calculateMagnitude(accelerometer);

    const sensorData = await SensorData.create({
      userId,
      deviceId,
      timestamp,
      accelerometer: {
        ...accelerometer,
        magnitude,
      },
      gyroscope,
    });

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

module.exports = {
  createSensorData,
  getSensorData,
};