const { redisClient } = require("../config/redisClient");

// ─── Gece / Gündüz Eşikleri ───────────────────────────────────────────────────
// Test sırasında daha düşük değerler kullanılabilir (örn. 60 ve 30).
const INACTIVITY_THRESHOLD_NIGHT_SEC = Number(process.env.INACTIVITY_THRESHOLD_NIGHT_SEC) || 28800; // 8 saat
const INACTIVITY_THRESHOLD_DAY_SEC   = Number(process.env.INACTIVITY_THRESHOLD_DAY_SEC)   || 7200;  // 2 saat
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kullanıcının uyku takvimine göre şu an için inactivity eşiğini (saniye) döner.
 *
 * Gece yarısını geçen aralıklar desteklenir (örn. nightStart="23:00", nightEnd="07:00"):
 *   isNight = (now >= nightStart) || (now < nightEnd)
 * Aynı gün içinde kalan aralıklar da desteklenir (örn. "01:00"–"06:00"):
 *   isNight = (now >= nightStart) && (now < nightEnd)
 *
 * @param {{ nightStart?: string, nightEnd?: string } | undefined} sleepSchedule
 * @returns {number} saniye cinsinden eşik
 */
function getInactivityThreshold(sleepSchedule) {
    const nightStart = sleepSchedule?.nightStart || "23:00";
    const nightEnd   = sleepSchedule?.nightEnd   || "07:00";

    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = nightStart.split(":").map(Number);
    const [eh, em] = nightEnd.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;

    let isNight;
    if (startMin > endMin) {
        // Gece yarısını aşan aralık (örn. 23:00 → 07:00)
        isNight = currentMin >= startMin || currentMin < endMin;
    } else {
        // Aynı gün içinde kalan aralık (örn. 01:00 → 06:00)
        isNight = currentMin >= startMin && currentMin < endMin;
    }

    return isNight ? INACTIVITY_THRESHOLD_NIGHT_SEC : INACTIVITY_THRESHOLD_DAY_SEC;
}

/**
 * Redis key'leri:
 *   inactivity:last_active:{deviceId}  → ISO timestamp string (TTL yok)
 *   inactivity:state:{deviceId}        → JSON { state, pre_alarm_start? } (TTL yok)
 *
 * State geçişleri: NORMAL → PRE_ALARM → CONFIRMED
 * clearInactivity her iki key'i silerek NORMAL'e döner.
 */

const lastActiveKey  = (d) => `inactivity:last_active:${d}`;
const stateKey       = (d) => `inactivity:state:${d}`;

/**
 * Son hareket zamanını şu an (ISO) olarak yazar.
 * Hareket tespit edildiğinde veya cihaz ilk kez görüldüğünde çağrılır.
 */
const updateLastActive = async (deviceId) => {
    await redisClient.set(lastActiveKey(deviceId), new Date().toISOString());
};

/**
 * Son hareket zaman damgasını döner.
 * @returns {Promise<string|null>} ISO string veya null (hiç aktif olmadıysa)
 */
const getLastActive = async (deviceId) => {
    return redisClient.get(lastActiveKey(deviceId));
};

/**
 * Inactivity state'ini döner.
 * @returns {Promise<"NORMAL"|"PRE_ALARM"|"CONFIRMED">}
 */
const getInactivityState = async (deviceId) => {
    const raw = await redisClient.get(stateKey(deviceId));
    if (!raw) return "NORMAL";
    try {
        return JSON.parse(raw).state || "NORMAL";
    } catch {
        return "NORMAL";
    }
};

/**
 * State'i PRE_ALARM yapar; pre_alarm_start = now olarak kaydeder.
 * SET NX (Not eXists) kullanılır — race condition durumunda yalnızca
 * ilk çağrı geçerli olur, sonrakiler no-op. Zaten PRE_ALARM ise etkisiz.
 * @returns {Promise<boolean>} true = state set edildi, false = zaten mevcuttu
 */
const setPreAlarm = async (deviceId) => {
    const value = JSON.stringify({
        state: "PRE_ALARM",
        pre_alarm_start: new Date().toISOString(),
    });
    const result = await redisClient.set(stateKey(deviceId), value, { NX: true });
    return result !== null;
};

/**
 * State'i CONFIRMED yapar (PRE_ALARM → CONFIRMED geçişi).
 */
const setConfirmed = async (deviceId) => {
    const raw = await redisClient.get(stateKey(deviceId));
    let pre_alarm_start = null;
    try {
        pre_alarm_start = raw ? JSON.parse(raw).pre_alarm_start : null;
    } catch { /* ignore */ }

    await redisClient.set(
        stateKey(deviceId),
        JSON.stringify({ state: "CONFIRMED", pre_alarm_start })
    );
};

/**
 * Her iki key'i siler — state NORMAL'e döner, timer sıfırlanır.
 * FALL_CONFIRMED sonrası ve kullanıcı "İyiyim" dediğinde çağrılır.
 */
const clearInactivity = async (deviceId) => {
    await redisClient.del(lastActiveKey(deviceId));
    await redisClient.del(stateKey(deviceId));
};

/**
 * PRE_ALARM başlangıç zamanını döner.
 * @returns {Promise<string|null>} ISO string veya null
 */
const getPreAlarmStart = async (deviceId) => {
    const raw = await redisClient.get(stateKey(deviceId));
    if (!raw) return null;
    try {
        return JSON.parse(raw).pre_alarm_start || null;
    } catch {
        return null;
    }
};

module.exports = {
    updateLastActive,
    getLastActive,
    getInactivityState,
    setPreAlarm,
    setConfirmed,
    clearInactivity,
    getPreAlarmStart,
    getInactivityThreshold,
};
