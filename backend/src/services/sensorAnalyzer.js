const { redisClient } = require("../config/redisClient");

// Redis'teki buffer'ın yaşam süresi (saniye).
// Her yeni veri eklendiğinde TTL sıfırlanır; son veriden 10 sn sonra otomatik temizlenir.
// 10 sn / 1.5 sn pencere ≈ 6-7 örnek biriktirir.
const BUFFER_TTL_SEC = 10;

// Anlamlı bir varyans hesabı için gereken minimum örnek sayısı.
// 5 örnek ile 2 örneğe kıyasla istatistiksel olarak çok daha güvenilir varyans üretilir.
const MIN_SAMPLES = 5;

// Buffer'da tutulacak maksimum örnek sayısı (hafıza sızıntısı önlemi).
// Sürekli aktif cihazlarda liste sonsuza büyümez; yalnızca son MAX_BUFFER_SIZE pencere saklanır.
const MAX_BUFFER_SIZE = 20;

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
    // Listenin sonsuza büyümesini önle: yalnızca son MAX_BUFFER_SIZE girişi sakla.
    await redisClient.lTrim(key, -MAX_BUFFER_SIZE, -1);
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
