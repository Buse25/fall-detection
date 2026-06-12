/**
 * Panel/Dashboard API yardımcıları
 * Endpoint'ler:
 *   GET /api/panel/stats
 *   GET /api/panel/recent-alarms
 *   GET /api/panel/sensor-chart?hours=N
 */
import apiClient from "./client";

/**
 * Dashboard özet istatistiklerini getirir.
 * @returns {{ totalAlarms, unresolvedAlarms, todayFalls, totalSensorRecords }}
 */
export async function fetchStats() {
  const { data } = await apiClient.get("/panel/stats");
  return data.data;
}

/**
 * Son 10 alarmı getirir.
 * @returns {Array} alarm dizisi
 */
export async function fetchRecentAlarms() {
  const { data } = await apiClient.get("/panel/recent-alarms");
  return data.data;
}

/**
 * Sensör grafiği için zaman serisi verisini getirir.
 * @param {number} hours - Son kaç saat (1-24), varsayılan 1
 * @param {string} deviceId - Opsiyonel cihaz kimliği
 * @returns {Array} sensör noktaları dizisi
 */
export async function fetchSensorChart(hours = 1, deviceId = "") {
  const params = { hours };
  if (deviceId) params.deviceId = deviceId;
  const { data } = await apiClient.get("/panel/sensor-chart", { params });
  return data.data;
}

/**
 * Benzersiz cihaz kimliklerini getirir.
 * @returns {Array} Cihaz kimlikleri dizisi
 */
export async function fetchDevices() {
  const { data } = await apiClient.get("/panel/devices");
  return data.data;
}
