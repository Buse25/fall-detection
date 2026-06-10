const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * AI servisinden düşme tahmini ister.
 * Şimdilik servis hazır olmadığı için her zaman null döner.
 *
 * @param {Object} sensorWindowPayload
 * @returns {Promise<Object|null>}
 */
const predictFall = async (sensorWindowPayload) => {
    // AI servisi hazır olduğunda aşağıdaki çağrı aktif edilecektir:
    //
    // try {
    //     const controller = new AbortController();
    //     const timeoutId = setTimeout(() => controller.abort(), 3000);
    //
    //     const response = await fetch(`${AI_SERVICE_URL}/predict`, {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify(sensorWindowPayload),
    //         signal: controller.signal,
    //     });
    //
    //     clearTimeout(timeoutId);
    //
    //     if (!response.ok) {
    //         return null;
    //     }
    //
    //     const data = await response.json();
    //     return data;
    // } catch (error) {
    //     return null;
    // }

    void sensorWindowPayload;
    void AI_SERVICE_URL;
    return null;
};

module.exports = {
    predictFall,
};
