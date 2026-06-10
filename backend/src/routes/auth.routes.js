const express = require("express");

const {
    register,
    login,
    getMe,
} = require("../controllers/auth.controller");

const { protect } = require("../middleware/auth.middleware");
const { handleValidationErrors } = require("../middleware/validation.middleware");
const {
    registerValidation,
    loginValidation,
} = require("../validators/auth.validators");

const router = express.Router();

router.post("/register", registerValidation, handleValidationErrors, register);
router.post("/login", loginValidation, handleValidationErrors, login);
router.get("/me", protect, getMe);

module.exports = router;
