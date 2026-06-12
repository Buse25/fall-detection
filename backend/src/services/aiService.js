const axios = require("axios");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

/**
 * AI mikroservisinden düşme tahmini ister.
 *
 * @param {Object} sensorWindow  - Mobil uygulamadan gelen sensör penceresi payload'ı
 * @param {string|null} userProfile - Kullanıcı profil tipi (örn: "yasli", "other")
 * @returns {Promise<{isFallDetected: boolean, fallScore: number, confidence: number, detectionMethod: string}|null>}
 *   Servis 3 saniye içinde yanıt vermezse veya hata olursa null döner (kural tabanlı fallback'e geçilir).
 */
const predictFall = async (sensorWindow, userProfile = null) => {
    try {
        const payload = userProfile
            ? { ...sensorWindow, profile: userProfile }
            : sensorWindow;

        const response = await axios.post(`${AI_SERVICE_URL}/predict`, payload, {
            timeout: 3000,
            headers: { "Content-Type": "application/json" },
        });

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const reason = error.code === "ECONNABORTED" ? "timeout (3s)" : error.message;
            console.warn(`[AiService] AI servisine ulaşılamadı (${reason}); kural tabanlı fallback aktif.`);
        } else {
            console.warn("[AiService] Beklenmeyen hata:", error?.message);
        }
        return null;
    }
};

module.exports = { predictFall };
