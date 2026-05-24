const express = require("express");
const { protect, adminOnly } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/example", protect, adminOnly, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Admin endpoint accessed successfully",
    });
});

module.exports = router;
