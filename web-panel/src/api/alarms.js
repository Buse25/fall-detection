/**
 * Alarm API yardımcıları
 * Endpoint'ler:
 *   GET    /api/alarms          → alarm listesi (filtreli)
 *   GET    /api/alarms/:id      → tekil alarm detayı
 *   PATCH  /api/alarms/:id/resolve → alarmı çözüldü işaretle
 */
import apiClient from "./client";

/**
 * Alarm listesini getirir.
 * @param {{ page?, limit?, severity?, isResolved?, startDate? }} params
 * @returns {Array} alarm dizisi
 */
export async function getAlarms(params = {}) {
  const { data } = await apiClient.get("/alarms", { params });
  return data; // { success, count, data }
}

/**
 * Tekil alarm detayını getirir.
 * @param {string} id - Alarm ID
 */
export async function getAlarmById(id) {
  const { data } = await apiClient.get(`/alarms/${id}`);
  return data.data;
}

/**
 * Bir alarmı çözüldü olarak işaretler.
 * @param {string} id - Alarm ID
 */
export async function resolveAlarm(id) {
  const { data } = await apiClient.patch(`/alarms/${id}/resolve`);
  return data;
}
