const { InternalServerError, NotFoundError, BadRequestError } = require("../core/error.response");
const { updateAvatar } = require("../helpers/createAvatar");
const Conversation = require("../models/conversation.model");
const User = require("../models/user.model");

class ConversationService {
    static getConversation = async ({ id, conversationId }) => {
        try {
            const conversation = await Conversation.findOne({
                _id: conversationId,
                participants: id
            })
                .populate({
                    path: "participants",
                    select: "full_name phone avatar_url is_online last_seen"
                })
                .populate({
                    path: "last_message",
                    select: "content sender attachments is_revoked deleted_by createdAt"
                });

            if (!conversation) {
                throw new NotFoundError("Conversation not found or user is not a participant");
            }

            const otherParticipants = conversation.participants.filter((par) => par._id.toString() !== id.toString());

            const response = {
                conversation_id: conversation._id,
                other_user: otherParticipants,
                last_message: conversation.last_message,
                last_message_time: conversation.last_message_time,
                conversation_type: conversation.conversation_type,
                group_name: conversation.group_name,
                group_avatar: conversation.group_avatar,
                is_group: conversation.is_group,
                admin: conversation.admin
            };

            return response;
        } catch (error) {
            throw new InternalServerError("Error when fetching conversation");
        }
    };

    static getAllUserConversations = async ({ id }) => {
        try {
            const conversations = await Conversation.find({
                participants: id
            })
                .populate({
                    path: "participants",
                    select: "full_name phone avatar_url is_online last_seen"
                })
                .populate({
                    path: "last_message",
                    select: "content sender attachments is_revoked deleted_by createdAt"
                })
                .sort({ last_message_time: -1 });

            const formattedConversations = conversations.map((conv) => {
                const otherUser = conv.participants.filter((par) => par._id.toString() !== id.toString());

                return {
                    conversation_id: conv._id,
                    other_user: otherUser,
                    last_message: conv.last_message,
                    last_message_time: conv.last_message_time,
                    conversation_type: conv.conversation_type,
                    unread: !conv.read_by.some(
                        (readInfo) =>
                            readInfo.user.toString() === id.toString() && readInfo.read_at > conv.last_message_time
                    ),
                    group_name: conv.group_name,
                    group_avatar: conv.group_avatar,
                    is_group: conv.is_group,
                    admin: conv.admin
                };
            });

            const friendConversations = formattedConversations.filter((conv) => conv.conversation_type === "friend");

            const strangerConversations = formattedConversations.filter(
                (conv) => conv.conversation_type === "stranger"
            );

            const groupConversations = formattedConversations.filter((conv) => conv.conversation_type === "group");

            return {
                friends: friendConversations,
                strangers: strangerConversations,
                groups: groupConversations
            };
        } catch (error) {
            throw new InternalServerError("Error when fetching conversation");
        }
    };

    static createConversation = async ({ id, otherUserId, groupName, file }) => {
        try {
            let participants = [id];

            if (typeof otherUserId === "string") otherUserId = JSON.parse(otherUserId);

            if (!otherUserId) throw new BadRequestError("otherUserId is required");

            if (!groupName) {
                let singleUserId;
                if (Array.isArray(otherUserId)) {
                    if (otherUserId.length !== 1) {
                        throw new BadRequestError(
                            "otherUserId must be a single user ID or an array with exactly one ID for normal conversation"
                        );
                    }
                    singleUserId = otherUserId[0];
                } else {
                    singleUserId = otherUserId;
                }

                const otherUser = await User.findById(singleUserId);
                if (!otherUser) {
                    throw new NotFoundError("Other user not found");
                }

                participants.push(singleUserId);

                const user = await User.findById(id);
                if (!user) {
                    throw new NotFoundError("User not found");
                }

                const isFriend = user.friends.includes(singleUserId);
                const conversationType = isFriend ? "friend" : "stranger";

                let conversation = await Conversation.findOne({
                    participants: { $all: [id, singleUserId], $size: 2 },
                    is_group: false
                });

                if (!conversation) {
                    conversation = new Conversation({
                        participants,
                        conversation_type: conversationType,
                        read_by: [{ user: id, read_at: new Date() }],
                        is_group: false
                    });

                    await conversation.save();
                }

                await conversation.populate({
                    path: "participants",
                    select: "full_name phone avatar_url is_online last_seen"
                });

                await conversation.populate({
                    path: "last_message",
                    select: "content sender attachments is_revoked deleted_by createdAt"
                });

                const otherParticipants = conversation.participants.filter(
                    (par) => par._id.toString() !== id.toString()
                );

                const response = {
                    conversation_id: conversation._id,
                    other_user: otherParticipants,
                    last_message: conversation.last_message,
                    last_message_time: conversation.last_message_time,
                    conversation_type: conversation.conversation_type,
                    group_name: conversation.group_name,
                    group_avatar: conversation.group_avatar,
                    is_group: conversation.is_group,
                    admin: conversation.admin
                };
                return response;
            }

            if (!Array.isArray(otherUserId) || otherUserId.length < 2) {
                throw new BadRequestError(
                    "Group conversation requires at least 3 participants including creator (otherUserId must be an array with 2+ IDs)"
                );
            }

            const users = await User.find({ _id: { $in: otherUserId } });
            if (users.length !== otherUserId.length) throw new NotFoundError("One or more users not found");

            participants = participants.concat(otherUserId);

            let group_avatar = "https://cdn-icons-png.flaticon.com/512/166/166258.png";

            if (file) {
                console.log(file);
                const buffer = file?.buffer;
                if (!buffer) throw new BadRequestError("Invalid image data");

                group_avatar = await updateAvatar(file.originalname, buffer);
                console.log(group_avatar);
                if (!group_avatar) throw new BadRequestError("Cannot create avatar");
            }

            const conversation = new Conversation({
                participants,
                conversation_type: "group",
                read_by: [{ user: id, read_at: new Date() }],
                group_avatar,
                group_name: groupName,
                is_group: true,
                admin: [id]
            });

            await conversation.save();

            await conversation.populate({
                path: "participants",
                select: "full_name phone avatar_url is_online last_seen"
            });

            await conversation.populate({
                path: "last_message",
                select: "content sender attachments is_revoked deleted_by createdAt"
            });

            const otherParticipants = conversation.participants.filter((par) => par._id.toString() !== id.toString());

            const response = {
                conversation_id: conversation._id,
                other_user: otherParticipants,
                participants: conversation.participants,
                last_message: conversation.last_message,
                last_message_time: conversation.last_message_time,
                conversation_type: conversation.conversation_type,
                group_name: conversation.group_name,
                group_avatar: conversation.group_avatar,
                is_group: conversation.is_group,
                admin: conversation.admin
            };
            return response;
        } catch (error) {
            console.log(error);
            throw new InternalServerError("Error when creating conversation");
        }
    };
}

module.exports = ConversationService;
