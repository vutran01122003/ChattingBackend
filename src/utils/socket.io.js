const { authenticationForSocket } = require("../auth/authUtils");
const UserService = require("../services/user.service");

const setupSocket = (io) => {
    io.use(async (socket, next) => {
        const { userId, token } = socket.handshake.auth;
        console.log({
            userId,
            token
        });

        try {
            const result = await authenticationForSocket(userId, token);
            if (!userId || !token) next(new Error(result.message));
            if (result.isValid) next();
        } catch (error) {
            next(error);
        }
    });

    const onlineUsers = new Map();
    global.onlineUsers = onlineUsers;

    io.on("connection", async (socket) => {
        const { userId } = socket.handshake.auth;
        if (!userId) return socket.disconnect();

        socket.userId = userId;

        UserService.updateUserStatus({
            userId: socket.userId,
            status: true
        }).then(() => {});

        socket.emit("user_status", {
            userId: socket.userId,
            status: "online"
        });

        socket.on("connected_user", async (userId) => {
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
            socket.broadcast.to(`conversation_${data.conversation_id}`).emit("receive_message", data);

            socket.broadcast.emit("conversation_updated", data);
        });

        socket.on("revoke_message", (data) => {
            socket.broadcast.to(`conversation_${data.conversation_id}`).emit("message_revoked", data);

            io.emit("conversation_updated", data);
        });

        socket.on("delete_message", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("message_deleted", data);
        });

        socket.on("forward_message", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("message_forwarded", data);
            io.emit("conversation_updated", data);
        });

        socket.on("focus_chat_page", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("focused_on_page", data);
        });

        socket.on("mark_read", (data) => {
            socket.broadcast.to(`conversation_${data.conversation_id}`).emit("message_read", data);
        });

        socket.on("typing", (data) => {
            socket.broadcast.to(`conversation_${data.conversation_id}`).emit("user_typing", {
                user: data.user,
                conversation_id: data.conversation_id
            });
        });

        socket.on("stop_typing", (data) => {
            socket.broadcast.to(`conversation_${data.conversation_id}`).emit("user_stop_typing");
        });

        socket.on("add_reaction", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("reaction_addded", data);
        });

        socket.on("remove_reaction", (data) => {
            io.to(`conversation_${data.conversation_id}`).emit("reaction_removed", data);
        });

        socket.on("disconnect", async () => {
            onlineUsers.delete(socket.userId);

            await UserService.updateUserStatus({
                userId: socket.userId,
                status: false,
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
            console.log(data);
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

        socket.on("create_conversation", (data) => {
            const otherUser = data.other_user;
            const socketIds = [];
            otherUser.forEach((user) => {
                const socketId = onlineUsers.get(user._id);
                if (socketId) socketIds.push(socketId);
            });

            if (socketIds.length > 0) io.sockets.to(socketIds).emit("create_conversation", data);
        });
        socket.on("update_conversation_members", (data) => {
            const otherUser = data.status === "add-members" ? data.other_user : [...data.other_user, data.removedUser];

            const socketIds = [];
            otherUser.forEach((user) => {
                const socketId = onlineUsers.get(user._id);
                if (socketId) socketIds.push(socketId);
                console.log(user._id, socketId);
            });

            if (socketIds.length > 0) io.sockets.to(socketIds).emit("update_conversation_members", data);
        });

        socket.on("update_conversation", (data) => {
            const otherUser = data.other_user;
            const socketIds = [];
            otherUser.forEach((user) => {
                const socketId = onlineUsers.get(user._id);
                if (socketId) socketIds.push(socketId);
            });
            console.log(socketIds);
            if (socketIds.length > 0) io.sockets.to(socketIds).emit("update_conversation", data);
        });

        socket.on("offer", (data) => {
            const { userIdList, offer } = data;
            const socketIds = [];
            userIdList.forEach((userId) => {
                const socketId = onlineUsers.get(userId);
                if (socketId) socketIds.push(socketId);
            });
            if (socketIds.length > 0) io.sockets.to(socketIds).emit("offer", offer);
        });

        socket.on("answer", (data) => {
            const { userIdList, answer } = data;
            const socketIds = [];
            userIdList.forEach((userId) => {
                const socketId = onlineUsers.get(userId);
                if (socketId) socketIds.push(socketId);
            });
            if (socketIds.length > 0) io.sockets.to(socketIds).emit("answer", answer);
        });

        socket.on("ice-candidate", (data) => {
            const { userIdList, candidate } = data;
            const socketIds = [];
            userIdList.forEach((userId) => {
                const socketId = onlineUsers.get(userId);
                if (socketId) socketIds.push(socketId);
            });

            if (socketIds.length > 0) io.sockets.to(socketIds).emit("ice-candidate", candidate);
        });

        socket.on("call_user_mobile", (data) => {
            socket.to(onlineUsers.get(data.receiver._id)).emit("answer_user_mobile", data);
        });

        socket.on("hang-up", (data) => {
            const { otherUserId } = data;
            io.to(onlineUsers.get(otherUserId)).emit("hang-up", data);
        });

        socket.on("change_password", (data) => {
            const { userId } = data;
            io.to(onlineUsers.get(userId)).emit("change_password");
        });
    });

    return io;
};

module.exports = setupSocket;
