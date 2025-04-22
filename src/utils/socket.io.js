const { authenticationForSocket } = require("../auth/authUtils");
const UserService = require("../services/user.service");

const setupSocket = (io) => {
    io.use(async (socket, next) => {
        const { userId, token } = socket.handshake.auth;

        try {
            if (!userId || !token) next(new Error(result.message));
            const result = await authenticationForSocket(userId, token);
            if (result.isValid) next();
        } catch (error) {
            console.log(error);
        }
    });

    const onlineUsers = new Map();

    io.on("connection", async (socket) => {
        const { userId } = socket.handshake.auth;

        if (!userId) {
            console.log("⚠️ Missing userId in socket handshake auth");
            return socket.disconnect();
        }

        socket.userId = userId;
        console.log("User connected:", socket.userId);

        onlineUsers.set(socket.userId, socket.id);

        await UserService.updateUserStatus({
            userId: socket.userId,
            status: true,
        });

        socket.emit("user_status", { userId: socket.userId, status: "online" });

        socket.on("join_conversation", (conversationId) => {
            socket.join(`conversation_${conversationId}`);
            console.log(
                `User ${socket.userId} joined conversation ${conversationId}`
            );
        });

        socket.on("send_message", (data) => {
            socket.broadcast
                .to(`conversation_${data.conversation_id}`)
                .emit("receive_message", data);

            socket.broadcast.emit("conversation_updated", data);
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
            socket.broadcast
                .to(`conversation_${data.conversation_id}`)
                .emit("user_typing", {
                    user: data.user,
                    conversation_id: data.conversation_id,
                });
        });

        socket.on("stop_typing", (data) => {
            socket.broadcast
                .to(`conversation_${data.conversation_id}`)
                .emit("user_stop_typing");
        });

        socket.on("disconnect", async () => {
            console.log("User disconnected:", socket.userId);
            onlineUsers.delete(socket.userId);

            await UserService.updateUserStatus({
                userId: socket.userId,
                status: false,
                last_seen: new Date(),
            });

            io.emit("user_status", {
                userId: socket.userId,
                status: "offline",
            });
        });
    });

    return io;
};

module.exports = setupSocket;
