const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({ url: REDIS_URL });

redisClient.on("error", (err) => {
    console.error("[Redis] Bağlantı hatası:", err.message);
});

redisClient.on("connect", () => {
    console.log(`[Redis] Bağlandı: ${REDIS_URL}`);
});

redisClient.on("reconnecting", () => {
    console.warn("[Redis] Yeniden bağlanılıyor...");
});

async function connectRedis() {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error("[Redis] İlk bağlantı kurulamadı:", err.message);
        // Sunucu Redis olmadan da başlar; state machine fallback'e geçer.
    }
}

module.exports = { redisClient, connectRedis };
