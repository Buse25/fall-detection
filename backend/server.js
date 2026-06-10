require("dotenv").config();

const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");

const initSocket = require("./src/sockets/socket");
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

const startServer = async () => {
    await connectDB();
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();