const express = require("express");

const {
  createSensorData,
  getSensorData,
<<<<<<< HEAD
=======
  getLatestSensorData,
  getFallDetectedData,
>>>>>>> feature/frontend
} = require("../controllers/sensorData.controller");

const router = express.Router();

router.post("/", createSensorData);
router.get("/", getSensorData);
<<<<<<< HEAD
=======
router.get("/latest", getLatestSensorData);
router.get("/falls", getFallDetectedData);
>>>>>>> feature/frontend

module.exports = router;