const SensorData = require("../models/SensorData");
const User = require("../models/User");

const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching users",
      error: error.message,
    });
  }
};

const getFalls = async (req, res) => {
  try {
    const { page = "1", limit = "10" } = req.query;
    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    const filter = {
      isFallDetected: true,
    };
    const skip = (pageNumber - 1) * limitNumber;
    const total = await SensorData.countDocuments(filter);
    const falls = await SensorData.find(filter)
      .sort({ timestamp: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      count: falls.length,
      page: pageNumber,
      limit: limitNumber,
      total,
      pages: Math.ceil(total / limitNumber),
      data: falls,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching falls",
      error: error.message,
    });
  }
};

const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalSensorRecords,
      totalFalls,
      latestFalls,
      latestSensorRecords,
    ] = await Promise.all([
      User.countDocuments(),
      SensorData.countDocuments(),
      SensorData.countDocuments({ isFallDetected: true }),
      SensorData.find({ isFallDetected: true })
        .sort({ timestamp: -1, createdAt: -1 })
        .limit(5),
      SensorData.find()
        .sort({ timestamp: -1, createdAt: -1 })
        .limit(5),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalSensorRecords,
        totalFalls,
        latestFalls,
        latestSensorRecords,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard",
      error: error.message,
    });
  }
};

module.exports = {
  getUsers,
  getFalls,
  getDashboard,
};
