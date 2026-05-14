const express = require("express");

const {
  getAlarms,
  getAlarmById,
  resolveAlarm,
} = require("../controllers/alarm.controller");

const router = express.Router();

router.get("/", getAlarms);
router.get("/:id", getAlarmById);
router.patch("/:id/resolve", resolveAlarm);

module.exports = router;