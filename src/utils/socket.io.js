const socketIo = require("socket.io");
const User = require("../models/user.model");

const setupSocket = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    const onlineUsers = new Map();

    io.on("connection", (socket) => {
        console.log("User connected:", socket.userId);

        onlineUsers.set(socket.userId, socket.id);

        io.emit("user_status", { userId: socket.userId, status: "online" });

        socket.on("join_conversation", (conversationId) => {
            socket.join(`conversation_${conversationId}`);
            console.log(
                `User ${socket.userId} joined conversation ${conversationId}`
            );
        });

        socket.on("send_message", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit(
                "receive_message",
                data
            );
        });

        socket.on("revoke_message", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit(
                "message_revoked",
                data
            );
        });

        socket.on("delete_message", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit(
                "message_deleted",
                data
            );
        });

        socket.on("forward_message", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit(
                "message_forwarded",
                data
            );
        });

        socket.on("mark_read", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit(
                "message_read",
                data
            );
        });

        socket.on("typing", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("user_typing", {
                userId: socket.userId,
                conversation_id: data.conversation_id,
            });
        });

        socket.on("stop_typing", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit(
                "user_stop_typing",
                {
                    userId: socket.userId,
                    conversation_id: data.conversation_id,
                }
            );
        });

        socket.on("disconnect", async () => {
            console.log("User disconnected:", socket.userId);
            onlineUsers.delete(socket.userId);

            await User.findByIdAndUpdate(socket.userId, {
                is_online: false,
                last_seen: new Date(),
            });

            offline;
            io.emit("user_status", {
                userId: socket.userId,
                status: "offline",
            });
        });
    });

    return io;
};

module.exports = setupSocket;
