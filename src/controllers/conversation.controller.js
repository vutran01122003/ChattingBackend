const { SuccessResponse } = require("../core/success.response");
const ConversationService = require("../services/conversation.service");

class ConversationController {
    async getUserConversations(req, res) {
        return new SuccessResponse({
            message: "Get User Conversations successfully",
            metadata: await ConversationService.getUserConversations({
                id: req.User.userId,
            }),
        }).send(res);
    }
    async createOrGetConversation(req, res) {
        return new SuccessResponse({
            message: "Create or Get Conversation successfully",
            metadata: await ConversationService.createOrGetConversation({
                id: req.User.userId,
                otherUserId: req.body.otherUserId,
            }),
        }).send(res);
    }
}

module.exports = new ConversationController();
