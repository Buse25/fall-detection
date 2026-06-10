const express = require("express");

const {
  createSensorData,
  getSensorData,
  getLatestSensorData,
  getFallDetectedData,
} = require("../controllers/sensorData.controller");

const router = express.Router();

router.post("/", createSensorData);
router.get("/", getSensorData);
router.get("/latest", getLatestSensorData);
router.get("/falls", getFallDetectedData);

module.exports = router;