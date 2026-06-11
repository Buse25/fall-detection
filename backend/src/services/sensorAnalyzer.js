const { redisClient } = require("../config/redisClient");

// Redis'teki buffer'ın yaşam süresi (saniye).
// Her yeni veri eklediğinde TTL sıfırlanır; son veriden 3 sn sonra otomatik temizlenir.
const BUFFER_TTL_SEC = 3;

// Anlamlı bir varyans hesabı için gereken minimum örnek sayısı.
// 50 Hz'de 1.5 sn'lik pencereler alınırsa her ~1.5 sn'de bir örnek gelir;
// 3 sn TTL ile buffer'da en fazla ~2 örnek birikir.
// Daha uzun geçmişe ihtiyaç duyulursa BUFFER_TTL_SEC artırılabilir.
const MIN_SAMPLES = 2;

/**
 * Redis key formatı: fall:buffer:{deviceId}
 * Değer: JSON string list — her eleman bir ivme büyüklüğü (float)
 */
const bufferKey = (deviceId) => `fall:buffer:${deviceId}`;

/**
 * Buffer'a bir ivme büyüklüğü değeri ekler ve TTL'yi sıfırlar.
 * @param {string} deviceId
 * @param {number} accelerationMagnitude  - İvmeölçer SMV değeri (g cinsinden)
 */
const addSensorData = async (deviceId, accelerationMagnitude) => {
    const key = bufferKey(deviceId);
    await redisClient.rPush(key, String(accelerationMagnitude));
    await redisClient.expire(key, BUFFER_TTL_SEC);
};

/**
 * Buffer'daki değerlerin popülasyon varyansını hesaplar.
 * Yetersiz örnek varsa null döner (belirsiz — bekle).
 * @param {string} deviceId
 * @returns {Promise<number|null>}
 */
const getVariance = async (deviceId) => {
    const raw = await redisClient.lRange(bufferKey(deviceId), 0, -1);
    if (!raw || raw.length < MIN_SAMPLES) return null;

    const values = raw.map(Number).filter(Number.isFinite);
    if (values.length < MIN_SAMPLES) return null;

    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return variance;
};

module.exports = { addSensorData, getVariance };
