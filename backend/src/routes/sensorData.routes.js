const express = require("express");

const {
  createSensorData,
  getSensorData,
  getLatestSensorData,
  getFallDetectedData,
} = require("../controllers/sensorData.controller");
const { protect } = require("../middleware/auth.middleware");
const { handleValidationErrors } = require("../middleware/validation.middleware");
const {
  createSensorDataValidation,
  listSensorDataValidation,
} = require("../validators/sensorData.validators");

const router = express.Router();

router.use(protect);

router.post("/", createSensorDataValidation, handleValidationErrors, createSensorData);
router.get("/", listSensorDataValidation, handleValidationErrors, getSensorData);
router.get("/latest", getLatestSensorData);
router.get("/falls", getFallDetectedData);

module.exports = router;
