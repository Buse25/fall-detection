/**
 * Auth API yardımcıları
 * Endpoint'ler: POST /api/auth/login, POST /api/auth/register,
 *               GET /api/auth/me, PATCH /api/auth/me
 */
import apiClient from "./client";

/** Kullanıcı girişi. { token, user } döner. */
export async function login(email, password) {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data; // { success, token, user }
}

/** Kullanıcı kaydı. { token, user } döner. */
export async function register(name, email, password) {
  const { data } = await apiClient.post("/auth/register", { name, email, password });
  return data;
}

/** Oturumdaki kullanıcı bilgilerini getirir. */
export async function getMe() {
  const { data } = await apiClient.get("/auth/me");
  return data.user; // { _id, name, email, role, emergencyContactName, emergencyContactPhone }
}

/**
 * Profili günceller.
 * @param {{ name?, emergencyContactName?, emergencyContactPhone? }} updateData
 */
export async function updateMe(updateData) {
  const { data } = await apiClient.patch("/auth/me", updateData);
  return data.user;
}
