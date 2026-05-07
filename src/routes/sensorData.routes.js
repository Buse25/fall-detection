const express = require("express");

const {
  createSensorData,
  getSensorData,
} = require("../controllers/sensorData.controller");

const router = express.Router();

router.post("/", createSensorData);
router.get("/", getSensorData);

module.exports = router;