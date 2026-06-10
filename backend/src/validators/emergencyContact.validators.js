const { body } = require("express-validator");

const createEmergencyContactValidation = [
  body("name")
    .exists({ checkFalsy: true })
    .withMessage("name is required")
    .bail()
    .isString()
    .withMessage("name must be a string"),
  body("phone")
    .exists({ checkFalsy: true })
    .withMessage("phone is required")
    .bail()
    .isString()
    .withMessage("phone must be a string"),
  body("relationship")
    .optional()
    .isString()
    .withMessage("relationship must be a string"),
  body("isPrimary")
    .optional()
    .isBoolean()
    .withMessage("isPrimary must be a boolean")
    .toBoolean(),
];

const updateEmergencyContactValidation = [
  body("name")
    .optional()
    .isString()
    .withMessage("name must be a string"),
  body("phone")
    .optional()
    .isString()
    .withMessage("phone must be a string"),
  body("relationship")
    .optional()
    .isString()
    .withMessage("relationship must be a string"),
  body("isPrimary")
    .optional()
    .isBoolean()
    .withMessage("isPrimary must be a boolean")
    .toBoolean(),
];

module.exports = {
  createEmergencyContactValidation,
  updateEmergencyContactValidation,
};
