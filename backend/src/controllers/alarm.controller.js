const Alarm = require("../models/Alarm");

/**
 * GET /api/alarms
 *
 * BUG FIX: Eski sürüm `{ userId: req.user._id }` filtrelemesi yapıyordu.
 * Admin kullanıcısının kendi userId'sine ait alarm kaydı olmadığı için tablo boş görünüyordu.
 *
 * FIX:
 *  - Admin rolü: filtre yok (tüm alarmlar)
 *  - Normal kullanıcı: sadece kendi userId'si
 *  - Desteklenen query parametreleri: alarmType, severity, isResolved, startDate, page, limit
 */
const getAlarms = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    const {
      page      = 1,
      limit     = 10,
      alarmType,
      severity,
      isResolved,
      startDate,
    } = req.query;

    // Admin tüm alarmları görür; normal kullanıcı sadece kendi kayıtlarını görür
    const filter = isAdmin ? {} : { userId: req.user._id.toString() };

    if (alarmType) filter.alarmType = alarmType;
    if (severity)  filter.severity  = severity;

    // isResolved string olarak gelir ("true" / "false")
    if (isResolved !== undefined && isResolved !== "") {
      filter.isResolved = isResolved === "true";
    }

    if (startDate) {
      // HTML date input: "YYYY-MM-DD" → UTC gece yarısını esas al
      filter.createdAt = { $gte: new Date(startDate) };
    }

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip     = (pageNum - 1) * limitNum;

    const [alarms, total] = await Promise.all([
      Alarm.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Alarm.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: total,   // toplam kayıt sayısı (frontend pagination için)
      data: alarms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching alarms",
      error: error.message,
    });
  }
};

const getAlarmById = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const query   = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id.toString() };

    const alarm = await Alarm.findOne(query).populate("sensorDataId");

    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: alarm,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching alarm",
      error: error.message,
    });
  }
};

const resolveAlarm = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const query   = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id.toString() };

    const alarm = await Alarm.findOneAndUpdate(
      query,
      { isResolved: true, resolvedAt: new Date() },
      { returnDocument: "after" }
    );

    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: "Alarm not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Alarm resolved successfully",
      data: alarm,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while resolving alarm",
      error: error.message,
    });
  }
};

module.exports = {
  getAlarms,
  getAlarmById,
  resolveAlarm,
};
