const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const SensorData = require("../models/SensorData");
const Alarm = require("../models/Alarm");
const { detectFallRuleBased, normalizeAiResult } = require("../analysis/fallDetection");
const { predictFall } = require("../services/aiService");

/**
 * Socket.io sunucusunu HTTP server üzerinde başlatır.
 * @param {import("http").Server} httpServer
 * @returns {import("socket.io").Server}
 */
function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.use((socket, next) => {
        try {
            const authToken = socket.handshake?.auth?.token;
            if (!authToken) {
                return next(new Error("Authentication token missing"));
            }

            const token = authToken.startsWith("Bearer ")
                ? authToken.slice(7)
                : authToken;

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            if (!decoded?.id) {
                return next(new Error("Invalid token payload"));
            }

            socket.userId = decoded.id.toString();
            return next();
        } catch (error) {
            return next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket) => {
        const userRoom = `user:${socket.userId}`;
        socket.join(userRoom);
        console.log(`[Socket] Bağlandı: ${socket.id} (room: ${userRoom})`);

        socket.on("join_panel_room", () => {
            const panelRoom = `panel:${socket.userId}`;
            socket.join(panelRoom);
        });

        socket.on("sensor_window", async (data) => {
            try {
                const readings = Array.isArray(data?.readings) ? data.readings : [];
                if (readings.length === 0) {
                    console.error(`[Socket] Geçersiz sensor_window payload: readings boş (${socket.id})`);
                    return;
                }

                const lastReading = readings[readings.length - 1] || {};
                const accel = lastReading.accelerometer || {};
                const gyro = lastReading.gyroscope || {};

                const ax = Number(accel.x) || 0;
                const ay = Number(accel.y) || 0;
                const az = Number(accel.z) || 0;
                const gx = Number(gyro.x) || 0;
                const gy = Number(gyro.y) || 0;
                const gz = Number(gyro.z) || 0;
                const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);

                const aiRawResult = await predictFall(data);
                const detection = aiRawResult
                    ? normalizeAiResult(aiRawResult)
                    : detectFallRuleBased(lastReading);

                const sensorData = await SensorData.create({
                    userId: socket.userId,
                    deviceId: data?.deviceId || "unknown_device",
                    timestamp: data?.windowEnd ? new Date(data.windowEnd) : new Date(),
                    accelerometer: {
                        x: ax,
                        y: ay,
                        z: az,
                        magnitude,
                    },
                    gyroscope: {
                        x: gx,
                        y: gy,
                        z: gz,
                    },
                    isFallDetected: detection.isFallDetected,
                    fallScore: detection.fallScore,
                    detectionMethod: detection.detectionMethod,
                });

                if (detection.isFallDetected) {
                    const alarm = await Alarm.create({
                        userId: socket.userId,
                        deviceId: data?.deviceId || "unknown_device",
                        sensorDataId: sensorData._id,
                        alarmType: "fall",
                        severity: "high",
                        message: `Fall detected by ${detection.detectionMethod}`,
                    });

                    io.to(userRoom).emit("fall_detected", {
                        alarmId: alarm._id,
                        fallScore: detection.fallScore,
                        detectionMethod: detection.detectionMethod,
                        countdownSec: 10,
                    });
                    io.to(`panel:${socket.userId}`).emit("fall_detected", {
                        alarmId: alarm._id,
                        fallScore: detection.fallScore,
                        detectionMethod: detection.detectionMethod,
                        countdownSec: 10,
                    });
                }
            } catch (error) {
                console.error(`[Socket] sensor_window işlenirken hata (${socket.id}):`, error.message);
            }
        });

        socket.on("disconnect", (reason) => {
            console.log(`[Socket] Bağlantı kesildi: ${socket.id} — ${reason}`);
        });
    });

    console.log("[Socket] Socket.io sunucusu hazır");
    return io;
}

module.exports = initSocket;
