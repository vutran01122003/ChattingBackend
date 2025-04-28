const {
    BadRequestError,
    NotFoundError,
    ForbiddenError,
    InternalServerError,
} = require("../core/error.response");
const { uploadBufferFileToCloudinary } = require("../helpers/uploadFile");
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");

class MessageService {
    static sendMessage = async ({ id, conversation_id, content, files }) => {
        try {
            const sender = id;
            const attachments = [];

            const conversation = await Conversation.findOne({
                _id: conversation_id,
                participants: sender,
            });

            if (!conversation) {
                throw new NotFoundError("Cannot find conversation");
            }

            if (files && files.length > 0) {
                for (const file of files) {
                    const buffer = file?.buffer;
                    let urlPath = null;
                    if (!buffer) {
                        throw new BadRequestError(
                            `File ${file.originalname} is invalid`
                        );
                    }

                    urlPath = await uploadBufferFileToCloudinary(
                        buffer,
                        new Date().getTime() + file.originalname
                    );

                    const fileInfo = {
                        file_name: file.originalname,
                        file_path: urlPath,
                        file_type: file.mimetype,
                        file_size: file.size,
                    };
                    attachments.push(fileInfo);
                }
            }

            const newMessage = new Message({
                conversation_id,
                sender,
                content: content || "",
                attachments,
                read_by: [sender],
            });

            await newMessage.save();

            await Conversation.findByIdAndUpdate(conversation_id, {
                last_message: newMessage._id,
                last_message_time: newMessage.createdAt,
                read_by: [{ user: sender, read_at: new Date() }],
            });

            await newMessage.populate({
                path: "sender",
                select: "full_name phone avatar_url",
            });

            return newMessage;
        } catch (error) {
            throw new InternalServerError("Error when sending message");
        }
    };
    static getMessages = async ({
        id,
        conversation_id,
        page = 1,
        limit = 20,
    }) => {
        try {
            const conversation = await Conversation.findOne({
                _id: conversation_id,
                participants: id,
            });

            if (!conversation) {
                throw new NotFoundError("Cannot find conversation");
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const messages = await Message.find({
                conversation_id,
            })
                .populate({
                    path: "sender",
                    select: "full_name phone avatar_url",
                })
                .populate({
                    path: "forwarded_from",
                    populate: {
                        path: "sender",
                        select: "full_name phone avatar_url",
                    },
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const unreadMessages = await Message.find({
                conversation_id,
                sender: { $ne: id },
                read_by: { $ne: id },
            });

            if (unreadMessages.length > 0) {
                await Message.updateMany(
                    {
                        conversation_id,
                        sender: { $ne: id },
                        read_by: { $ne: id },
                    },
                    { $addToSet: { read_by: id } }
                );

                await Conversation.findByIdAndUpdate(conversation_id, {
                    $push: {
                        read_by: {
                            user: id,
                            read_at: new Date(),
                        },
                    },
                });
            }

            return {
                messages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    hasMore: messages.length === parseInt(limit),
                },
            };
        } catch (error) {
            throw new InternalServerError("Error when getting message");
        }
    };
    static revokeMessage = async ({ id, message_id }) => {
        try {
            const message = await Message.findById(message_id);

            if (!message) {
                throw new NotFoundError("Cannot find message");
            }

            if (message.sender.toString() !== id.toString()) {
                throw new ForbiddenError(
                    "You are not authourized to revoke this message"
                );
            }

            message.is_revoked = true;
            await message.save();

            return await message.populate({
                path: "sender",
                select: "full_name phone avatar_url",
            });
        } catch (error) {
            throw new InternalServerError("Error when revoking message");
        }
    };
    static deleteMessage = async ({ id, message_id }) => {
        try {
            const message = await Message.findById(message_id);

            if (!message) {
                throw new NotFoundError("Cannot find message");
            }

            message.deleted_by.push(id);
            await message.save();

            return await message.populate({
                path: "sender",
                select: "full_name phone avatar_url",
            });
        } catch (error) {
            throw new InternalServerError("Error when revoking message");
        }
    };
    static forwardMessage = async ({
        id,
        message_id,
        target_conversion_id,
    }) => {
        try {
            const originalMessage = await Message.findById(message_id);
            if (!originalMessage) {
                throw new NotFoundError("Cannot find message");
            }

            const targetConversation = await Conversation.findOne({
                _id: target_conversion_id,
                participants: id,
            });

            if (!targetConversation) {
                throw new NotFoundError("Cannot find conversation");
            }

            const forwardedMessage = new Message({
                conversation_id: target_conversion_id,
                sender: id,
                content: originalMessage.content,
                attachments: originalMessage.attachments,
                read_by: [id],
                forwarded_from: originalMessage._id,
            });

            await forwardedMessage.save();

            await Conversation.findByIdAndUpdate(target_conversion_id, {
                last_message: forwardedMessage._id,
                last_message_time: forwardedMessage.createdAt,
                read_by: [{ user: id, read_at: new Date() }],
            });

            await forwardedMessage.populate({
                path: "sender",
                select: "full_name phone avatar_url",
            });

            await forwardedMessage.populate({
                path: "forwarded_from",
                populate: {
                    path: "sender",
                    select: "full_name phone avatar_url",
                },
            });

            return forwardedMessage;
        } catch (error) {
            throw new InternalServerError("Error when revoking message");
        }
    };
    static markMessagesAsRead = async ({ id, conversation_id }) => {
        try {
            await Message.updateMany(
                {
                    conversation_id,
                    sender: { $ne: id },
                    read_by: { $ne: id },
                },
                { $addToSet: { read_by: id } }
            );

            await Conversation.findByIdAndUpdate(conversation_id, {
                $push: {
                    read_by: {
                        user: id,
                        read_at: new Date(),
                    },
                },
            });

            return { success: true };
        } catch (error) {
            throw new InternalServerError(
                "Error when marking messages as read"
            );
        }
    };
    static addReaction = async ({ id, message_id, emoji }) => {
        try {
            console.log(message_id, emoji);

            const message = await Message.findById(message_id);

            if (!message) {
                throw new NotFoundError("Cannot find message");
            }

            const validEmojis = [
                ":heart",
                ":like",
                ":haha",
                ":wow",
                ":huhu",
                ":angry",
            ];
            if (!validEmojis.includes(emoji)) {
                throw new BadRequestError("Invalid emoji");
            }

            const existingReaction = message.reactions.find(
                (reaction) => reaction.user.toString() === id.toString()
            );

            if (existingReaction) {
                existingReaction.emoji = emoji;
            } else {
                message.reactions.push({ user: id, emoji });
            }

            await message.save();
            return await message.populate({
                path: "sender",
                select: "full_name phone avatar_url",
            });
        } catch (error) {
            throw new InternalServerError("Error when adding reaction");
        }
    };

    static removeReaction = async ({ id, message_id }) => {
        try {
            const message = await Message.findById(message_id);

            if (!message) {
                throw new NotFoundError("Cannot find message");
            }

            message.reactions = message.reactions.filter(
                (reaction) => reaction.user.toString() !== id.toString()
            );

            await message.save();
            return await message.populate({
                path: "sender",
                select: "full_name phone avatar_url",
            });
        } catch (error) {
            throw new InternalServerError("Error when removing reaction");
        }
    };
}

module.exports = MessageService;
