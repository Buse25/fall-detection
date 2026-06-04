const express = require("express");

const {
  getAlarms,
  getAlarmById,
  resolveAlarm,
} = require("../controllers/alarm.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.get("/", getAlarms);
router.get("/:id", getAlarmById);
router.patch("/:id/resolve", resolveAlarm);

module.exports = router;
