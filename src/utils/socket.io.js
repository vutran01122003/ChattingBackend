const { Server } = require("socket.io");
const User = require("../models/user.model");

const setupSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    const onlineUsers = new Map();

    io.on("connection", (socket) => {
        socket.on("connected_user", (userId) => {
            socket.userId = userId;
            onlineUsers.set(userId, socket.id);

            const users = [];
            onlineUsers.forEach((value, key, map) => {
                users.push({
                    [key]: value
                });
            });

            io.emit("user_online_list", users);
        });

        socket.on("join_conversation", (conversationId) => {
            socket.join(`conversation_${conversationId}`);
            console.log(`User ${socket.userId} joined conversation ${conversationId}`);
        });

        socket.on("send_message", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("receive_message", data);
        });

        socket.on("revoke_message", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("message_revoked", data);
        });

        socket.on("delete_message", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("message_deleted", data);
        });

        socket.on("forward_message", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("message_forwarded", data);
        });

        socket.on("mark_read", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("message_read", data);
        });

        socket.on("typing", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("user_typing", {
                userId: socket.userId,
                conversation_id: data.conversation_id
            });
        });

        socket.on("stop_typing", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("user_stop_typing", {
                userId: socket.userId,
                conversation_id: data.conversation_id
            });
        });

        socket.on("disconnect", async () => {
            onlineUsers.delete(socket.userId);

            await User.findByIdAndUpdate(socket.userId, {
                is_online: false,
                last_seen: new Date()
            });

            io.emit("user_status", {
                userId: socket.userId,
                status: "offline"
            });
        });

        socket.on("call_user", (data) => {
            socket.to(onlineUsers.get(data.receiver._id)).emit("answer_user", data);
        });

        socket.on("end_call", (data) => {
            socket.to(onlineUsers.get(data.restUserId)).emit("end_call", data);
        });

        socket.on("answer_call", (data) => {
            socket.to(onlineUsers.get(data.senderId)).emit("answer_call", data);
        });

        socket.on("play_video", (data) => {
            socket.to(onlineUsers.get(data.userId)).emit("play_remote_video", data);
        });

        socket.on("play_video_receiver", (data) => {
            socket.to(onlineUsers.get(data.receiverId)).emit("play_video_receiver", data);
        });
    });

    return io;
};

module.exports = setupSocket;
