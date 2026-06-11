/**
 * Merkezi Axios istemcisi.
 * - Her istekte Authorization header'ını localStorage token'ından otomatik ekler.
 * - 401 yanıtında token'ı silerek kullanıcıyı login'e yönlendirir.
 */
import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Request interceptor — JWT token ekle
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("vc_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — 401 durumunda oturumu kapat ve login'e yönlendir
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("vc_token");
      // SPA içinde yönlendirme; history API'si yerine tam sayfa yüklemesi kullanılır
      // çünkü bu interceptor React bağlamı dışında çalışır.
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
