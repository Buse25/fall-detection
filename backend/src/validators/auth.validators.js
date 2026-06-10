const { body } = require("express-validator");

const registerValidation = [
  body("name")
    .exists({ checkFalsy: true })
    .withMessage("Name is required"),
  body("email")
    .isEmail()
    .withMessage("Email must be a valid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Email must be a valid email address"),
  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required"),
];

module.exports = {
  registerValidation,
  loginValidation,
};
