const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const SensorData = require("../models/SensorData");
const Alarm = require("../models/Alarm");
const { detectFallRuleBased } = require("../analysis/fallDetection");
const { predictFall } = require("../services/aiService");
const { setImpactDetected, getState, clearState } = require("../services/fallStateManager");
const { addSensorData, getVariance } = require("../services/sensorAnalyzer");

// ─── Varyans Eşikleri ────────────────────────────────────────────────────────
// Test sırasında cihaz ve ortama göre ayarlanması gerekebilir.
// DÜŞÜK  → bu değerin altında hareket yok sayılır → düşme ONAYLANDI
// YÜKSEK → bu değerin üstünde hareket sürüyor   → yanlış alarm İPTAL edildi
const VARIANCE_LOW_THRESHOLD = 0.5;   // g² — düşük varyans: kişi sabit
const VARIANCE_HIGH_THRESHOLD = 1.5;  // g² — yüksek varyans: kişi hareket ediyor
// ─────────────────────────────────────────────────────────────────────────────

/** User.profileType → AI servisinin beklediği profil string'ine dönüştürür. */
function mapProfileType(profileType) {
    return profileType === "elderly" ? "yasli" : (profileType || "other");
}

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

    io.use(async (socket, next) => {
        try {
            const authToken = socket.handshake?.auth?.token;
            if (!authToken) {
                return next(new Error("Authentication token missing"));
            }

            const token = authToken.startsWith("Bearer ")
                ? authToken.slice(7)
                : authToken;

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (!decoded?.id) {
                return next(new Error("Invalid token payload"));
            }

            socket.userId = decoded.id.toString();

            // Kullanıcı profilini bağlantı kurulurken bir kez çek; her pencerede DB sorgusu yapılmaz.
            const user = await User.findById(socket.userId).select("profileType").lean();
            socket.userProfile = mapProfileType(user?.profileType);

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

                const deviceId = data?.deviceId || "unknown_device";
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

                // ── 1. AI Tahmini ────────────────────────────────────────────
                const aiRawResult = await predictFall(data, socket.userProfile);
                console.log("[AI Tahmini]", aiRawResult);

                // ── 2. Sensör buffer'ına pencere ortalaması ekle ─────────────
                await addSensorData(deviceId, magnitude);

                // ── 3. Ham sensör verisini her zaman kaydet (log amaçlı) ─────
                const sensorData = await SensorData.create({
                    userId: socket.userId,
                    deviceId,
                    timestamp: data?.windowEnd ? new Date(data.windowEnd) : new Date(),
                    accelerometer: { x: ax, y: ay, z: az, magnitude },
                    gyroscope: { x: gx, y: gy, z: gz },
                    isFallDetected: aiRawResult ? aiRawResult.is_fall : false,
                    fallScore: aiRawResult ? aiRawResult.probability : magnitude,
                    detectionMethod: aiRawResult ? "ai-model" : "rule-based",
                });

                // ── 4. AI yoksa kural tabanlı fallback ───────────────────────
                if (!aiRawResult) {
                    const ruleDet = detectFallRuleBased(lastReading);
                    if (ruleDet.isFallDetected) {
                        const alarm = await Alarm.create({
                            userId: socket.userId,
                            deviceId,
                            sensorDataId: sensorData._id,
                            alarmType: "fall",
                            severity: "high",
                            message: "Fall detected by rule-based fallback (AI unavailable)",
                        });
                        const fallPayload = {
                            alarmId: alarm._id,
                            fallScore: ruleDet.fallScore,
                            detectionMethod: "rule-based",
                            countdownSec: 10,
                        };
                        io.to(userRoom).emit("fall_detected", fallPayload);
                        io.to(`panel:${socket.userId}`).emit("fall_detected", fallPayload);
                    }
                    return;
                }

                // ── 5. State Machine ─────────────────────────────────────────
                const currentState = await getState(deviceId);

                if (currentState === "NORMAL") {
                    if (aiRawResult.is_fall) {
                        await setImpactDetected(deviceId, data?.windowEnd || new Date().toISOString());
                        console.log(
                            `[StateMachine] NORMAL → IMPACT_DETECTED` +
                            ` | device: ${deviceId}` +
                            ` | probability: ${aiRawResult.probability.toFixed(3)}`
                        );
                    }

                } else if (currentState === "IMPACT_DETECTED") {
                    const variance = await getVariance(deviceId);
                    console.log(
                        `[StateMachine] IMPACT_DETECTED` +
                        ` | device: ${deviceId}` +
                        ` | varyans: ${variance !== null ? variance.toFixed(4) : "yetersiz veri"}`
                    );

                    if (variance === null) {
                        // Henüz yeterli veri yok; TTL dolana kadar bekle
                        return;
                    }

                    if (variance < VARIANCE_LOW_THRESHOLD) {
                        // ── FALL_CONFIRMED ──────────────────────────────────
                        const alarm = await Alarm.create({
                            userId: socket.userId,
                            deviceId,
                            sensorDataId: sensorData._id,
                            alarmType: "fall",
                            severity: "high",
                            message: `Fall confirmed (AI + low variance: ${variance.toFixed(4)})`,
                        });
                        await clearState(deviceId);

                        console.log(
                            `[StateMachine] IMPACT_DETECTED → FALL_CONFIRMED` +
                            ` | alarmId: ${alarm._id}` +
                            ` | varyans: ${variance.toFixed(4)}`
                        );

                        const fallPayload = {
                            alarmId: alarm._id,
                            fallScore: aiRawResult.probability,
                            detectionMethod: "ai-model",
                            countdownSec: 10,
                        };
                        io.to(userRoom).emit("fall_detected", fallPayload);
                        io.to(`panel:${socket.userId}`).emit("fall_detected", fallPayload);

                    } else if (variance > VARIANCE_HIGH_THRESHOLD) {
                        // ── YANLISH ALARM — hareket devam ediyor ─────────────
                        await clearState(deviceId);
                        console.log(
                            `[StateMachine] IMPACT_DETECTED → NORMAL (yanlış alarm iptal)` +
                            ` | device: ${deviceId}` +
                            ` | varyans: ${variance.toFixed(4)}`
                        );
                    }
                    // VARIANCE_LOW_THRESHOLD <= variance <= VARIANCE_HIGH_THRESHOLD → bekle
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
