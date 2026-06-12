const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const SensorData = require("../models/SensorData");
const Alarm = require("../models/Alarm");
const Device = require("../models/Device");
const { detectFallRuleBased } = require("../analysis/fallDetection");
const { predictFall } = require("../services/aiService");
const { setImpactDetected, getState, clearState } = require("../services/fallStateManager");
const { addSensorData, getVariance } = require("../services/sensorAnalyzer");
const {
    updateLastActive,
    getLastActive,
    getInactivityState,
    setPreAlarm,
    setConfirmed,
    clearInactivity,
    getPreAlarmStart,
    getInactivityThreshold,
} = require("../services/inactivityManager");

// ─── Düşme Varyans Eşikleri ──────────────────────────────────────────────────
// Test sırasında cihaz ve ortama göre ayarlanması gerekebilir.
const VARIANCE_LOW_THRESHOLD  = 0.5;   // g² — düşük varyans: kişi sabit → FALL_CONFIRMED
const VARIANCE_HIGH_THRESHOLD = 1.5;   // g² — yüksek varyans: kişi hareket ediyor → iptal

// ─── Hareketsizlik Eşikleri ───────────────────────────────────────────────────
// Gece/gündüz eşikleri inactivityManager.getInactivityThreshold() ile hesaplanır.
// Test: PRE_ALARM_TIMEOUT_SEC=10 (env ile override edilebilir)
const MOVEMENT_VARIANCE_THRESHOLD = 0.1;   // g² — bu değerin üstü "hareket var" sayılır
const PRE_ALARM_TIMEOUT_SEC       = Number(process.env.PRE_ALARM_TIMEOUT_SEC) || 60;
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

            // Kullanıcı profilini, uyku takvimini ve rolünü bağlantı başına bir kez çek.
            // Her sensor_window'da DB sorgusu yapılmaz; socket nesnesinde cache'lenir.
            const user = await User.findById(socket.userId).select("profileType sleepSchedule role").lean();
            socket.userProfile   = mapProfileType(user?.profileType);
            socket.sleepSchedule = user?.sleepSchedule || { nightStart: "23:00", nightEnd: "07:00" };
            socket.userRole      = user?.role || "user";

            return next();
        } catch (error) {
            return next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket) => {
        const userRoom = `user:${socket.userId}`;
        socket.join(userRoom);
        // lastDeviceId: sensor_window handler'ında set edilir; inactivity_cancel handler'ında kullanılır.
        socket.lastDeviceId = null;

        // Admin kullanıcılar her yeni bağlantıda (sayfa yenileme dahil) otomatik olarak
        // panel odasına alınır. Bu sayede web panelinin join_panel_room emit etmesini
        // beklemeye gerek kalmaz; reconnect sonrası panel eventi kaybı önlenir.
        if (socket.userRole === "admin") {
            const panelRoom = `panel:${socket.userId}`;
            socket.join(panelRoom);
            console.log(`[Socket] Bağlandı (admin auto-join): ${socket.id} | rooms: ${userRoom}, ${panelRoom}`);
        } else {
            console.log(`[Socket] Bağlandı: ${socket.id} (room: ${userRoom})`);
        }

        // join_panel_room: web panel tarafından açık join için hâlâ desteklenir.
        socket.on("join_panel_room", () => {
            const panelRoom = `panel:${socket.userId}`;
            socket.join(panelRoom);
        });

        // ── fall_cancel ──────────────────────────────────────────────────────
        // Mobile "İyiyim (İptal Et)" butonu tıklandığında emit edilir.
        // Fall state ve Alarm kaydı REST API (PATCH /api/alarms/:id/resolve) tarafından
        // güncellenir; burada panel odasını bilgilendiriyoruz.
        socket.on("fall_cancel", ({ alarmId } = {}) => {
            console.log(`[FallSM] Alarm kullanıcı tarafından iptal edildi | alarmId: ${alarmId || "yok"} | user: ${socket.userId}`);
            io.to(`panel:${socket.userId}`).emit("alarm_resolved", {
                alarmId,
                resolvedBy: "user",
                alarmType: "fall",
            });
        });

        // ── inactivity_cancel ────────────────────────────────────────────────
        // Mobile "İyiyim, Ben Buradayım" butonu tıklandığında emit edilir.
        socket.on("inactivity_cancel", async () => {
            const deviceId = socket.lastDeviceId;
            if (!deviceId) {
                console.warn(`[Inactivity] inactivity_cancel alındı ama lastDeviceId yok (${socket.id})`);
                return;
            }
            await clearInactivity(deviceId);
            await updateLastActive(deviceId);
            console.log(`[Inactivity] PRE_ALARM iptal edildi (kullanıcı onayı) | device: ${deviceId}`);
        });

        // ── sensor_window ────────────────────────────────────────────────────
        socket.on("sensor_window", async (data) => {
            try {
                const readings = Array.isArray(data?.readings) ? data.readings : [];
                if (readings.length === 0) {
                    console.error(`[Socket] Geçersiz sensor_window payload: readings boş (${socket.id})`);
                    return;
                }

                const deviceId = data?.deviceId || "unknown_device";
                // Son bilinen deviceId'yi socket üzerinde tut (inactivity_cancel için).
                socket.lastDeviceId = deviceId;

                const lastReading = readings[readings.length - 1] || {};
                const accel = lastReading.accelerometer || {};
                const gyro  = lastReading.gyroscope    || {};

                const ax = Number(accel.x) || 0;
                const ay = Number(accel.y) || 0;
                const az = Number(accel.z) || 0;
                const gx = Number(gyro.x)  || 0;
                const gy = Number(gyro.y)  || 0;
                const gz = Number(gyro.z)  || 0;
                const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);

                // ── 0. Panel: cihaz durumu anlık güncellemesi ─────────────────
                // gyroscopeMagnitude: web panelinin jiroskop grafiği için önceden hesaplanır,
                // böylece panel {x,y,z}'yi tekrar işlemek zorunda kalmaz.
                const gyroscopeMagnitude = parseFloat(
                    Math.sqrt(gx * gx + gy * gy + gz * gz).toFixed(3)
                );
                io.to(`panel:${socket.userId}`).emit("device_status", {
                    deviceId,
                    magnitude: parseFloat(magnitude.toFixed(3)),
                    gyroscopeMagnitude,
                    timestamp: data?.windowEnd || new Date().toISOString(),
                });

                // ── 1. AI Tahmini ─────────────────────────────────────────────
                const aiRawResult = await predictFall(data, socket.userProfile);
                console.log("[AI Tahmini]", aiRawResult);

                // ── 2. Sensör buffer'ına pencere ortalaması ekle ──────────────
                await addSensorData(deviceId, magnitude);

                // ── 3. Ham sensör verisini her zaman kaydet (log amaçlı) ──────
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

                // Cihazı upsert et: varsa lastSeen/isOnline güncelle, yoksa yeni kayıt oluştur.
                await Device.findOneAndUpdate(
                    { deviceId },
                    { userId: socket.userId, lastSeen: new Date(), isOnline: true },
                    { upsert: true, setDefaultsOnInsert: true, returnDocument: 'after' }
                );

                // ── 4. AI yoksa kural tabanlı fallback ────────────────────────
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

                // ── 5. Fall State Machine ─────────────────────────────────────
                const fallCurrentState = await getState(deviceId);

                if (fallCurrentState === "NORMAL") {
                    if (aiRawResult.is_fall) {
                        await setImpactDetected(deviceId, data?.windowEnd || new Date().toISOString());
                        console.log(
                            `[FallSM] NORMAL → IMPACT_DETECTED` +
                            ` | device: ${deviceId}` +
                            ` | probability: ${aiRawResult.probability.toFixed(3)}`
                        );
                    }

                } else if (fallCurrentState === "IMPACT_DETECTED") {
                    const variance = await getVariance(deviceId);
                    console.log(
                        `[FallSM] IMPACT_DETECTED | device: ${deviceId}` +
                        ` | varyans: ${variance !== null ? variance.toFixed(4) : "yetersiz veri"}`
                    );

                    if (variance === null) return;

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
                        // S1 kararı: clearInactivity + updateLastActive ardışık, araya başka await yok.
                        await clearInactivity(deviceId);
                        await updateLastActive(deviceId);

                        console.log(
                            `[FallSM] IMPACT_DETECTED → FALL_CONFIRMED | alarmId: ${alarm._id}`
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
                        await clearState(deviceId);
                        console.log(
                            `[FallSM] IMPACT_DETECTED → NORMAL (yanlış alarm iptal)` +
                            ` | device: ${deviceId} | varyans: ${variance.toFixed(4)}`
                        );
                    }
                    return; // IMPACT_DETECTED aşamasındayken inactivity bloğunu atlıyoruz
                }

                // ── 6. Inactivity State Machine ───────────────────────────────
                // Yalnızca fall state NORMAL olduğunda çalışır (yukarıdaki return ile guard edildi).

                // Talimat #2: İlk penceredeyse last_active'i initialize et.
                const lastActiveRaw = await getLastActive(deviceId);
                if (lastActiveRaw === null) {
                    await updateLastActive(deviceId);
                    console.log(`[Inactivity] last_active initialize edildi | device: ${deviceId}`);
                    return;
                }

                const variance = await getVariance(deviceId);

                // Talimat #4: updateLastActive → sonra PreCheck sırası korunuyor.
                if (variance !== null && variance > MOVEMENT_VARIANCE_THRESHOLD) {
                    // Hareket tespit edildi: last_active güncelle
                    await updateLastActive(deviceId);

                    // Sonra PRE_ALARM kontrolü: hareket varsa PRE_ALARM'ı iptal et
                    const inactState = await getInactivityState(deviceId);
                    if (inactState === "PRE_ALARM") {
                        await clearInactivity(deviceId);
                        await updateLastActive(deviceId);
                        console.log(
                            `[Inactivity] PRE_ALARM otomatik iptal (hareket tespit edildi)` +
                            ` | device: ${deviceId} | varyans: ${variance.toFixed(4)}`
                        );
                        io.to(userRoom).emit("inactivity_cancelled", {});
                    }
                    return;
                }

                // Hareketsiz — inactivity threshold kontrolü
                const now = Date.now();
                const lastActive = new Date(lastActiveRaw).getTime();
                const idleSec = (now - lastActive) / 1000;

                // Gece/gündüz uyku takvimine göre dinamik eşik
                const inactivityThresholdSec = getInactivityThreshold(socket.sleepSchedule);
                if (idleSec < inactivityThresholdSec) return;

                const inactState = await getInactivityState(deviceId);

                if (inactState === "NORMAL") {
                    const set = await setPreAlarm(deviceId);  // NX: yalnızca bir kez set edilir
                    if (set) {
                        console.log(
                            `[Inactivity] NORMAL → PRE_ALARM | device: ${deviceId}` +
                            ` | idle: ${Math.round(idleSec)}s`
                        );
                        io.to(userRoom).emit("inactivity_pre_alarm", {
                            countdownSec: PRE_ALARM_TIMEOUT_SEC,
                        });
                    }

                } else if (inactState === "PRE_ALARM") {
                    const preStart = await getPreAlarmStart(deviceId);
                    if (!preStart) return;

                    const preElapsedSec = (now - new Date(preStart).getTime()) / 1000;
                    if (preElapsedSec < PRE_ALARM_TIMEOUT_SEC) return;

                    // PRE_ALARM_TIMEOUT aşıldı → CONFIRMED
                    await setConfirmed(deviceId);
                    const alarm = await Alarm.create({
                        userId: socket.userId,
                        deviceId,
                        sensorDataId: sensorData._id,
                        alarmType: "inactivity",
                        severity: "high",
                        message: `Inactivity confirmed (idle: ${Math.round(idleSec)}s, pre_alarm: ${Math.round(preElapsedSec)}s)`,
                    });
                    console.log(
                        `[Inactivity] PRE_ALARM → CONFIRMED | alarmId: ${alarm._id}` +
                        ` | device: ${deviceId}`
                    );
                    io.to(userRoom).emit("emergency_alert", {
                        alarmId: alarm._id,
                        type: "inactivity",
                    });
                    io.to(`panel:${socket.userId}`).emit("emergency_alert", {
                        alarmId: alarm._id,
                        type: "inactivity",
                    });
                }
                // CONFIRMED ise hiçbir şey yapma — alarm zaten gönderildi

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
