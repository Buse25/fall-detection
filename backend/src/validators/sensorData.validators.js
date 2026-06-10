const { body, query } = require("express-validator");

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const createSensorDataValidation = [
  body("deviceId")
    .exists({ checkFalsy: true })
    .withMessage("deviceId is required")
    .bail()
    .isString()
    .withMessage("deviceId must be a string"),
  body("accelerometer.x")
    .custom(isFiniteNumber)
    .withMessage("accelerometer.x must be a number"),
  body("accelerometer.y")
    .custom(isFiniteNumber)
    .withMessage("accelerometer.y must be a number"),
  body("accelerometer.z")
    .custom(isFiniteNumber)
    .withMessage("accelerometer.z must be a number"),
  body("gyroscope.x")
    .custom(isFiniteNumber)
    .withMessage("gyroscope.x must be a number"),
  body("gyroscope.y")
    .custom(isFiniteNumber)
    .withMessage("gyroscope.y must be a number"),
  body("gyroscope.z")
    .custom(isFiniteNumber)
    .withMessage("gyroscope.z must be a number"),
  body("timestamp")
    .optional()
    .isISO8601()
    .withMessage("timestamp must be a valid ISO date"),
];

const listSensorDataValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be a positive integer between 1 and 100"),
  query("deviceId")
    .optional()
    .isString()
    .withMessage("deviceId must be a string"),
  query("isFallDetected")
    .optional()
    .isBoolean()
    .withMessage("isFallDetected must be a boolean"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO date"),
];

module.exports = {
  createSensorDataValidation,
  listSensorDataValidation,
};
