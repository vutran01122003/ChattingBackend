const {
    InternalServerError,
    NotFoundError,
} = require("../core/error.response");
const Conversation = require("../models/conversation.model");
const User = require("../models/user.model");

class ConversationService {
    static getUserConversations = async ({ id }) => {
        try {
            const conversations = await Conversation.find({
                participants: id,
            })
                .populate({
                    path: "participants",
                    select: "full_name phone avatar_url is_online last_seen",
                })
                .populate({
                    path: "last_message",
                    select: "content sender attachments is_revoked is_deleted createdAt",
                })
                .sort({ last_message_time: -1 });

            const formattedConversations = conversations.map((conv) => {
                const otherParticipant = conv.participants.find(
                    (par) => par._id.toString() !== id.toString()
                );

                return {
                    conversation_id: conv._id,
                    other_user: otherParticipant,
                    last_message: conv.last_message,
                    last_message_time: conv.last_message_time,
                    conversation_type: conv.conversation_type,
                    unread: !conv.read_by.some(
                        (readInfo) =>
                            readInfo.user.toString() === id.toString() &&
                            readInfo.read_at > conv.last_message_time
                    ),
                };
            });

            const friendConversations = formattedConversations.filter(
                (conv) => conv.conversation_type === "friend"
            );

            const strangerConversations = formattedConversations.filter(
                (conv) => conv.conversation_type === "stranger"
            );

            return {
                friends: friendConversations,
                strangers: strangerConversations,
            };
        } catch (error) {
            throw new InternalServerError("Error when fetching conversation");
        }
    };
    static createOrGetConversation = async ({ id, otherUserId }) => {
        try {
            const otherUser = await User.findById(otherUserId);

            if (!otherUser) {
                throw new NotFoundError("Cannot find user");
            }

            const user = await User.findById(id);

            const isFriend = user.friends.includes(otherUserId);
            const conversationType = isFriend ? "friend" : "stranger";

            let conversation = await Conversation.findOne({
                participants: { $all: [id, otherUserId] },
            });

            if (!conversation) {
                conversation = new Conversation({
                    participants: [id, otherUserId],
                    conversation_type: conversationType,
                    read_by: [{ user: id, read_at: new Date() }],
                });

                await conversation.save();
            }

            await conversation.populate({
                path: "participants",
                select: "full_name phone avatar_url is_online last_seen",
            });

            await conversation.populate({
                path: "last_message",
                select: "content sender attachments is_revoked is_deleted createdAt",
            });

            const otherParticipant = conversation.participants.find(
                (par) => par._id.toString() !== id.toString()
            );

            return {
                conversation_id: conversation._id,
                other_user: otherParticipant,
                last_message: conversation.last_message,
                conversation_type: conversation.conversation_type,
            };
        } catch (error) {
            throw new InternalServerError(
                "Error when create or get conversation"
            );
        }
    };
}

module.exports = ConversationService;
