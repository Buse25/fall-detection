/**
 * Socket.io bağlantı yöneticisi — Singleton
 *
 * Kullanım:
 *   import { connectSocket, disconnectSocket, getSocket } from './socket';
 *
 *   // Giriş sonrası bağlan:
 *   connectSocket(token);
 *
 *   // Olay dinleme:
 *   getSocket()?.on('fall_detected', handler);
 *
 *   // Çıkışta bağlantıyı kes:
 *   disconnectSocket();
 *
 * Backend Socket olayları:
 *   EMIT → join_panel_room   : Panel odası aboneliği
 *   ON   → fall_detected     : { alarmId, fallScore, detectionMethod, countdownSec }
 */
import { io } from "socket.io-client";

let socket = null;

/**
 * Socket.io bağlantısı kurar.
 * @param {string} token - JWT token (Bearer prefix eklenmeden)
 */
export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io("/", {
    auth: { token: `Bearer ${token}` },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Bağlandı:", socket.id);
    // Panel odasına katıl — backend: panel:{userId}
    socket.emit("join_panel_room");
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Bağlantı kesildi:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Bağlantı hatası:", err.message);
  });

  return socket;
}

/**
 * Mevcut socket örneğini döner. Bağlı değilse null döner.
 */
export function getSocket() {
  return socket;
}

/**
 * Socket bağlantısını kapatır (kullanıcı çıkışında çağrılır).
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("[Socket] Bağlantı manuel olarak kapatıldı.");
  }
}
