const http = require("http");
const app = require("./src/app");
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const setupSocket = require("./src/utils/socket.io");
setupSocket(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    process.on("SIGINT", () => {
        server.close((_) => {
            console.log("Server closed due to app termination");
        });
    });
});
