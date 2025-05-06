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
                participants: conversation.participants,
                last_message: conversation.last_message,
                last_message_time: conversation.last_message_time,
                conversation_type: conversation.conversation_type,
                group_name: conversation.group_name,
                group_avatar: conversation.group_avatar,
                is_group: conversation.is_group,
                admin: conversation.admin,
                sub_admin: conversation.sub_admin,
                allow_send_message: conversation.allow_send_message,
                allow_change_group_info: conversation.allow_change_group_info,
                is_active: conversation.is_active
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
                    participants: conv.participants,
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
                    admin: conv.admin,
                    sub_admin: conv.sub_admin,
                    allow_send_message: conv.allow_send_message,
                    allow_change_group_info: conv.allow_change_group_info,
                    is_active: conv.is_active
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

    static updateMembersToConversation = async ({ id, conversationId, userIdList, status }) => {
        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) throw new NotFoundError("Conversation does not exist");

            if (status === "add-members") conversation.participants.push(...userIdList);
            else {
                const participants = [...conversation.participants];
                const sub_admin = [...conversation.sub_admin];
                const admin = [...conversation.admin];

                conversation.participants = participants.filter(
                    (participantId) => !userIdList.includes(participantId.toString())
                );

                conversation.sub_admin = sub_admin.filter(
                    (sub_admin_id) => !userIdList.includes(sub_admin_id.toString())
                );

                conversation.admin = admin.filter((admin_id) => !userIdList.includes(admin_id.toString()));

                if (conversation.admin.length === 0) {
                    if (conversation.sub_admin.length > 0) {
                        conversation.admin.push(conversation.sub_admin[0]);
                        conversation.sub_admin.shift();
                    } else {
                        if (conversation.participants.length > 0) conversation.admin.push(conversation.participants[0]);
                        else conversation.is_active = false;
                    }
                }
            }

            await conversation.save();

            const populatedConversation = await Conversation.populate(conversation, [
                {
                    path: "participants",
                    select: "full_name phone avatar_url is_online last_seen"
                },
                {
                    path: "last_message",
                    select: "content sender attachments is_revoked deleted_by createdAt"
                }
            ]);

            return {
                conversation_id: populatedConversation._id,
                other_user: populatedConversation.participants.filter((person) => person._id.toString() !== id),
                participants: populatedConversation.participants,
                last_message: populatedConversation.last_message,
                last_message_time: populatedConversation.last_message_time,
                conversation_type: populatedConversation.conversation_type,
                unread: !populatedConversation.read_by.some(
                    (readInfo) =>
                        readInfo.user.toString() === id.toString() &&
                        readInfo.read_at > populatedConversation.last_message_time
                ),
                group_name: populatedConversation.group_name,
                group_avatar: populatedConversation.group_avatar,
                is_group: populatedConversation.is_group,
                admin: populatedConversation.admin,
                sub_admin: populatedConversation.sub_admin,
                allow_send_message: populatedConversation.allow_send_message,
                allow_change_group_info: populatedConversation.allow_change_group_info,
                is_active: populatedConversation.is_active
            };
        } catch (error) {
            console.log(error);
            throw new InternalServerError("Error when add member to conversation");
        }
    };

    static updateConversation = async ({
        id,
        conversationId,
        groupName,
        file,
        admin,
        subAdmin,
        subAdminStatus,
        allowSendMessage,
        allowChangeGroupInfo,
        isActive,
        base64
    }) => {
        try {
            let group_avatar = null;

            if (file || base64) {
                const buffer = base64 ? Buffer.from(base64, "base64") : file?.buffer;
                if (!buffer) throw new BadRequestError("Invalid image data");

                group_avatar = await updateAvatar(conversationId, buffer);
                if (!group_avatar) throw new BadRequestError("Cannot create avatar");
            }

            const updateQuery = {
                $push: {},
                $pull: {},
                $set: {}
            };

            if (subAdmin && subAdminStatus === "add-sub-admin") updateQuery.$push.sub_admin = subAdmin;
            if (subAdmin && subAdminStatus === "delete-sub-admin") updateQuery.$pull.sub_admin = subAdmin[0];
            if (groupName) updateQuery.$set.group_name = groupName;
            if (allowSendMessage !== undefined) updateQuery.$set.allow_send_message = allowSendMessage;
            if (allowChangeGroupInfo !== undefined) updateQuery.$set.allow_change_group_info = allowChangeGroupInfo;
            if (isActive !== undefined) updateQuery.$set.is_active = isActive;
            if (group_avatar) updateQuery.$set.group_avatar = group_avatar;
            if (admin) updateQuery.$set.admin = admin;
            if (Object.keys(updateQuery.$push).length === 0) delete updateQuery.$push;
            if (Object.keys(updateQuery.$pull).length === 0) delete updateQuery.$pull;
            if (Object.keys(updateQuery.$set).length === 0) delete updateQuery.$set;

            const updatedConversation = await Conversation.findByIdAndUpdate(conversationId, updateQuery, {
                new: true
            }).populate([
                {
                    path: "participants",
                    select: "full_name phone avatar_url is_online last_seen"
                },
                {
                    path: "last_message",
                    select: "content sender attachments is_revoked deleted_by createdAt"
                }
            ]);

            if (!updatedConversation) return NotFoundError("Conversation does not exist");

            const response = {
                conversation_id: updatedConversation._id,
                other_user: updatedConversation.participants.filter((person) => person._id.toString() !== id),
                participants: updatedConversation.participants,
                last_message: updatedConversation.last_message,
                last_message_time: updatedConversation.last_message_time,
                conversation_type: updatedConversation.conversation_type,
                group_name: updatedConversation.group_name,
                group_avatar: updatedConversation.group_avatar,
                is_group: updatedConversation.is_group,
                admin: updatedConversation.admin,
                sub_admin: updatedConversation.sub_admin,
                allow_send_message: updatedConversation.allow_send_message,
                allow_change_group_info: updatedConversation.allow_change_group_info,
                is_active: updatedConversation.is_active
            };
            return response;
        } catch (error) {
            console.log(error);
            throw new InternalServerError("Error when update conversation");
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
                    participants: conversation.participants,
                    last_message: conversation.last_message,
                    last_message_time: conversation.last_message_time,
                    conversation_type: conversation.conversation_type,
                    group_name: conversation.group_name,
                    group_avatar: conversation.group_avatar,
                    is_group: conversation.is_group,
                    admin: conversation.admin,
                    sub_admin: conversation.sub_admin,
                    allow_send_message: conversation.allow_send_message,
                    allow_change_group_info: conversation.allow_change_group_info,
                    is_active: conversation.is_active
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
                const buffer = file?.buffer;
                if (!buffer) throw new BadRequestError("Invalid image data");

                group_avatar = await updateAvatar(file.originalname, buffer);
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
                admin: conversation.admin,
                sub_admin: conversation.sub_admin,
                allow_send_message: conversation.allow_send_message,
                allow_change_group_info: conversation.allow_change_group_info,
                is_active: conversation.is_active
            };
            return response;
        } catch (error) {
            console.log(error);
            throw new InternalServerError("Error when creating conversation");
        }
    };
}

module.exports = ConversationService;
