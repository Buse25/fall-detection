const FALL_ACCELERATION_THRESHOLD = 2.5;

/**
 * @typedef {Object} Axis3D
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {Object} SensorReading
 * @property {Axis3D} accelerometer
 * @property {Axis3D} gyroscope
 */

/**
 * Tek sensör okuması üzerinde kural tabanlı düşme tespiti yapar.
 * @param {SensorReading} reading
 * @returns {{ isFallDetected: boolean, fallScore: number, detectionMethod: string }}
 */
const detectFallRuleBased = (reading) => {
    const accelerometer = reading?.accelerometer || {};
    const x = Number(accelerometer.x) || 0;
    const y = Number(accelerometer.y) || 0;
    const z = Number(accelerometer.z) || 0;

    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const isFallDetected = magnitude > FALL_ACCELERATION_THRESHOLD;

    return {
        isFallDetected,
        fallScore: magnitude,
        detectionMethod: "rule-based",
    };
};

/**
 * AI servisinden dönen ham sonucu standart formata normalize eder.
 * @param {any} aiResult
 * @returns {{ isFallDetected: boolean, fallScore: number, confidence: number, detectionMethod: string }}
 */
const normalizeAiResult = (aiResult) => {
    return {
        isFallDetected: Boolean(aiResult?.isFallDetected),
        fallScore: Number(aiResult?.fallScore) || 0,
        confidence: Number(aiResult?.confidence) || 0,
        detectionMethod: aiResult?.detectionMethod || "ai-model",
    };
};

module.exports = {
    FALL_ACCELERATION_THRESHOLD,
    detectFallRuleBased,
    normalizeAiResult,
};
