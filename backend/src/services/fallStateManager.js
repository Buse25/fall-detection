const { redisClient } = require("../config/redisClient");

// IMPACT_DETECTED state'inin Redis'te yaşam süresi (saniye).
// Bu TTL içinde doğrulama gelmezse state otomatik NORMAL'e döner.
const IMPACT_TTL_SEC = 3;

/**
 * Redis key formatı: fall:state:{deviceId}
 * Değer: JSON string — { state: "IMPACT_DETECTED", timestamp: ISO string }
 */
const stateKey = (deviceId) => `fall:state:${deviceId}`;

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

module.exports = { setImpactDetected, getState, clearState };
