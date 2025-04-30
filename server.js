const app = require("./src/app");
const { Server } = require("socket.io");
const setupSocket = require("./src/utils/socket.io");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

global.io = io;

setupSocket(io);

process.on("SIGINT", () => {
    server.close((_) => {
        console.log("Server closed due to app termination");
    });
});
