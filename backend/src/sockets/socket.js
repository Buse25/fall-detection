const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getTokenFromSocket = (socket) => {
  const token =
    socket.handshake.auth?.token || socket.handshake.headers?.authorization;

  if (!token) {
    return null;
  }

  return token.replace(/^Bearer\s+/i, "");
};

/**
 * Socket.io sunucusunu HTTP server uzerinde baslatir.
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

  io.use(async (socket, next) => {
    try {
      const token = getTokenFromSocket(socket);

      if (!token) {
        return next(new Error("Authentication failed"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication failed"));
      }

      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `[Socket] Baglandi: ${socket.id}, userId: ${socket.user._id}`
    );

    socket.on("sensor_window", (data) => {
      const count = data?.readings?.length ?? 0;
      console.log(
        `[Socket] sensor_window alindi (${socket.id}) - ${count} okuma, userId: ${socket.user._id}`
      );
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Baglanti kesildi: ${socket.id} - ${reason}`);
    });
  });

  console.log("[Socket] Socket.io sunucusu hazir");
  return io;
}

module.exports = initSocket;
