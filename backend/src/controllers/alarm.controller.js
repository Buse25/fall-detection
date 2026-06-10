const Alarm = require("../models/Alarm");

const getAlarms = async (req, res) => {
  try {
    const alarms = await Alarm.find({ userId: req.user._id.toString() })
      .populate("sensorDataId")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: alarms.length,
      data: alarms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching alarms",
      error: error.message,
    });
  }
};

const getAlarmById = async (req, res) => {
  try {
    const alarm = await Alarm.findOne({
      _id: req.params.id,
      userId: req.user._id.toString(),
    }).populate("sensorDataId");

    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: alarm,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching alarm",
      error: error.message,
    });
  }
};

const resolveAlarm = async (req, res) => {
  try {
    const alarm = await Alarm.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id.toString(),
      },
      {
        isResolved: true,
        resolvedAt: new Date(),
      },
      { returnDocument: "after" }
    );

    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Alarm resolved successfully",
      data: alarm,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while resolving alarm",
      error: error.message,
    });
  }
};

module.exports = {
  getAlarms,
  getAlarmById,
  resolveAlarm,
};
