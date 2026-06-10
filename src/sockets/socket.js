const { Server } = require("socket.io");

/**
 * Socket.io sunucusunu HTTP server üzerinde başlatır.
 * @param {import("http").Server} httpServer
 * @returns {import("socket.io").Server}
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Bağlandı: ${socket.id}`);

    socket.on("sensor_window", (data) => {
      const count = data?.readings?.length ?? 0;
      console.log(
        `[Socket] sensor_window alındı (${socket.id}) — ${count} okuma, userId: ${data?.userId ?? "bilinmiyor"}`
      );
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Bağlantı kesildi: ${socket.id} — ${reason}`);
    });
  });

  console.log("[Socket] Socket.io sunucusu hazır");
  return io;
}

module.exports = initSocket;
