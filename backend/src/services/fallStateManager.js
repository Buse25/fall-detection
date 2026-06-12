const { redisClient } = require("../config/redisClient");

// IMPACT_DETECTED state'inin Redis'te yaşam süresi (saniye).
// MIN_SAMPLES=5 ve ~1.5s/pencere ile en az 5 pencere birikmesi için yeterli süre.
const IMPACT_TTL_SEC = 10;

// Düşme onayı sonrası yeni alarm üretimine konulan bekleme süresi (saniye).
// Aynı düşmede tekrar eden AI sinyallerinin çoklu alarm oluşturmasını engeller.
const FALL_COOLDOWN_SEC = Number(process.env.FALL_COOLDOWN_SEC) || 120;

/**
 * Redis key formatları:
 *   fall:state:{deviceId}    → JSON { state, timestamp }
 *   fall:cooldown:{deviceId} → "1" (yalnızca varlığı kontrol edilir)
 */
const stateKey    = (deviceId) => `fall:state:${deviceId}`;
const cooldownKey = (deviceId) => `fall:cooldown:${deviceId}`;

/**
 * Belirtilen cihaz için state'i IMPACT_DETECTED yapar ve TTL=3sn ile Redis'e yazar.
 * @param {string} deviceId
 * @param {string} timestamp  - Etkiyi tetikleyen pencerenin windowEnd değeri (ISO string)
 */
const setImpactDetected = async (deviceId, timestamp) => {
    await redisClient.set(
        stateKey(deviceId),
        JSON.stringify({ state: "IMPACT_DETECTED", timestamp }),
        { EX: IMPACT_TTL_SEC }
    );
};

/**
 * Belirtilen cihazın mevcut state'ini döner.
 * Redis'te kayıt yoksa veya TTL süresi dolduysa "NORMAL" döner.
 * @param {string} deviceId
 * @returns {Promise<"NORMAL"|"IMPACT_DETECTED">}
 */
const getState = async (deviceId) => {
    const raw = await redisClient.get(stateKey(deviceId));
    if (!raw) return "NORMAL";
    try {
        return JSON.parse(raw).state || "NORMAL";
    } catch {
        return "NORMAL";
    }
};

/**
 * Belirtilen cihazın state'ini siler (NORMAL'e döner).
 * Düşme onayı veya yanlış alarm iptali sonrasında çağrılır.
 * Redis TTL zaten otomatik temizler; bu çağrı anlık sıfırlama içindir.
 * @param {string} deviceId
 */
const clearState = async (deviceId) => {
    await redisClient.del(stateKey(deviceId));
};

/**
 * Düşme onayı veya iptal sonrasında FALL_COOLDOWN_SEC süreliğine cooldown başlatır.
 * Cooldown aktifken yeni IMPACT_DETECTED geçişi ve alarm üretimi engellenir.
 * @param {string} deviceId
 */
const setCooldown = async (deviceId) => {
    await redisClient.set(cooldownKey(deviceId), "1", { EX: FALL_COOLDOWN_SEC });
};

/**
 * Cihazın cooldown döneminde olup olmadığını kontrol eder.
 * @param {string} deviceId
 * @returns {Promise<boolean>} true = cooldown aktif (alarm üretme)
 */
const isInCooldown = async (deviceId) => {
    const raw = await redisClient.get(cooldownKey(deviceId));
    return raw !== null;
};

module.exports = { setImpactDetected, getState, clearState, setCooldown, isInCooldown };
