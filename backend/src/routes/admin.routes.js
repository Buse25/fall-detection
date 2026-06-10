const express = require("express");
const { protect, adminOnly } = require("../middleware/auth.middleware");
const {
    getUsers,
    getFalls,
    getDashboard,
} = require("../controllers/admin.controller");
const { handleValidationErrors } = require("../middleware/validation.middleware");
const { adminFallsValidation } = require("../validators/admin.validators");

const router = express.Router();

router.get("/example", protect, adminOnly, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Admin endpoint accessed successfully",
    });
});
router.get("/users", protect, adminOnly, getUsers);
router.get(
    "/falls",
    protect,
    adminOnly,
    adminFallsValidation,
    handleValidationErrors,
    getFalls
);
router.get("/dashboard", protect, adminOnly, getDashboard);

module.exports = router;
