require("dotenv").config();

const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { connectRedis } = require("./src/config/redisClient");

const initSocket = require("./src/sockets/socket");
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

const startServer = async () => {
    await connectDB();
    await connectRedis();
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();