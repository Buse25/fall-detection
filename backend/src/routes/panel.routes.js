const express = require("express");
const SensorData = require("../models/SensorData");
const Alarm = require("../models/Alarm");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect, adminOnly);

/**
 * Kural: admin rolündeki istek sahibi tüm kullanıcıların verisini görür.
 * Bu helper, endpoint'lerin Mongoose sorgularında kullanılacak filtre nesnesini
 * döner; böylece admin her sorgu için tekrar tekrar if/else yazmak zorunda kalmaz.
 *
 * @param {import("express").Request} req
 * @param {string} [userIdOverride] - İsteğe bağlı: Belirli bir userId için filtrele
 * @returns {{ userId?: string }}
 */
function buildBaseFilter(req, userIdOverride) {
    if (userIdOverride) return { userId: userIdOverride };
    if (req.user.role === "admin") return {};           // sistem geneli
    return { userId: req.user._id.toString() };
}

// ── GET /api/panel/stats ──────────────────────────────────────────────────────
// Admin: sistem geneli istatistikler (tüm kullanıcılar) + totalUsers sayısı.
// Normal user (teorik; adminOnly middleware zaten engeller): kendi verisi.
router.get("/stats", async (req, res) => {
    try {
        const base = buildBaseFilter(req);
        const isAdmin = req.user.role === "admin";

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const promises = [
            Alarm.countDocuments(base),
            Alarm.countDocuments({ ...base, isResolved: false }),
            SensorData.countDocuments({
                ...base,
                isFallDetected: true,
                timestamp: { $gte: startOfToday },
            }),
            SensorData.countDocuments(base),
        ];

        // Yalnızca admin toplam kullanıcı sayısını görür
        if (isAdmin) promises.push(User.countDocuments({}));

        const [totalAlarms, unresolvedAlarms, todayFalls, totalSensorRecords, totalUsers] =
            await Promise.all(promises);

        return res.status(200).json({
            success: true,
            data: {
                totalAlarms,
                unresolvedAlarms,
                todayFalls,
                totalSensorRecords,
                ...(isAdmin && { totalUsers }),
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error while fetching panel stats",
            error: error.message,
        });
    }
});

// ── GET /api/panel/recent-alarms ─────────────────────────────────────────────
// Admin: tüm kullanıcıların son 10 alarmı.
// İsteğe bağlı query: ?userId=<id>  — belirli bir kullanıcıya filtrele.
router.get("/recent-alarms", async (req, res) => {
    try {
        const base = buildBaseFilter(req, req.query.userId);

        const alarms = await Alarm.find(base)
            .populate("sensorDataId")
            .sort({ isResolved: 1, createdAt: -1 })
            .limit(10);

        return res.status(200).json({
            success: true,
            count: alarms.length,
            data: alarms,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error while fetching recent alarms",
            error: error.message,
        });
    }
});

// ── GET /api/panel/sensor-chart ───────────────────────────────────────────────
// Admin: tüm kullanıcıların sensör verisi.
// Query params:
//   hours    : 1–24 (varsayılan 1)
//   deviceId : opsiyonel — belirli cihazı filtrele
//   userId   : opsiyonel — belirli kullanıcıya filtrele (admin için)
router.get("/sensor-chart", async (req, res) => {
    try {
        const hoursParam = Number.parseInt(req.query.hours, 10);
        const hours = Number.isNaN(hoursParam) ? 1 : Math.min(Math.max(hoursParam, 1), 24);

        const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);

        const base = buildBaseFilter(req, req.query.userId);

        const query = {
            ...base,
            timestamp: { $gte: fromDate },
        };
        if (req.query.deviceId) {
            query.deviceId = req.query.deviceId;
        }

        const points = await SensorData.find(query)
            .sort({ timestamp: 1 })
            .select("timestamp accelerometer gyroscope isFallDetected deviceId");

        return res.status(200).json({
            success: true,
            hours,
            count: points.length,
            data: points,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error while fetching sensor chart data",
            error: error.message,
        });
    }
});

// ── GET /api/panel/devices ────────────────────────────────────────────────────
// Admin: sistemdeki tüm cihazları listeler.
// İsteğe bağlı query: ?userId=<id>  — belirli kullanıcının cihazlarına filtrele.
router.get("/devices", async (req, res) => {
    try {
        const base = buildBaseFilter(req, req.query.userId);

        const devicesData = await SensorData.aggregate([
            { $match: base },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: "$deviceId",
                    lastSeen: { $first: "$timestamp" },
                    magnitude: { $first: "$accelerometer.magnitude" },
                    // userId: cihazın sahibini kayıt edelim (admin tablosu için)
                    userId: { $first: "$userId" },
                    fallCount: {
                        $sum: { $cond: [{ $eq: ["$isFallDetected", true] }, 1, 0] },
                    },
                },
            },
            { $sort: { lastSeen: -1 } },
        ]);

        const devices = devicesData
            .filter((d) => d._id)
            .map((d) => ({
                deviceId: d._id,
                lastSeen: d.lastSeen,
                magnitude: d.magnitude || 0,
                fallCount: d.fallCount || 0,
                userId: d.userId || null,
                isOnline: Date.now() - new Date(d.lastSeen).getTime() < 5 * 60 * 1000,
            }));

        return res.status(200).json({
            success: true,
            data: devices,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error while fetching devices",
            error: error.message,
        });
    }
});

module.exports = router;
