/**
 * Sensör Verisi API yardımcıları
 * Endpoint'ler:
 *   GET  /api/sensor-data           → kayıt listesi
 *   GET  /api/sensor-data/latest    → en son kayıt
 *   GET  /api/sensor-data/falls     → düşme tespiti kayıtları
 */
import apiClient from "./client";

/**
 * Sensör kayıtlarını sayfalı olarak getirir.
 * @param {{ page?, limit?, startDate?, endDate? }} params
 */
export async function getSensorData(params = {}) {
  const { data } = await apiClient.get("/sensor-data", { params });
  return data; // { success, count, data }
}

/**
 * En son sensör kaydını getirir.
 */
export async function getLatestSensorData() {
  const { data } = await apiClient.get("/sensor-data/latest");
  return data.data;
}

/**
 * Düşme tespiti olan sensör kayıtlarını getirir.
 */
export async function getFallDetectedData() {
  const { data } = await apiClient.get("/sensor-data/falls");
  return data; // { success, count, data }
}
