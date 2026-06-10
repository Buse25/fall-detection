const mongoose = require("mongoose");

const alarmSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },

    deviceId: {
      type: String,
      required: true,
      trim: true,
    },

    sensorDataId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SensorData",
      required: true,
    },

    alarmType: {
      type: String,
      enum: ["fall", "inactivity", "anomaly"],
      default: "fall",
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "high",
    },

    message: {
      type: String,
      default: "Fall detected",
    },

    isResolved: {
      type: Boolean,
      default: false,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Alarm", alarmSchema);