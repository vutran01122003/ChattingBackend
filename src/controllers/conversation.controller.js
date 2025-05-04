const { SuccessResponse } = require("../core/success.response");
const ConversationService = require("../services/conversation.service");

class ConversationController {
    async getUserConversation(req, res) {
        return new SuccessResponse({
            message: "Get User Conversation successfully",
            metadata: await ConversationService.getConversation({
                id: req.User.userId,
                conversationId: req.params.conversation_id
            })
        }).send(res);
    }
    async getAllUserConversations(req, res) {
        return new SuccessResponse({
            message: "Get All User Conversations successfully",
            metadata: await ConversationService.getAllUserConversations({
                id: req.User.userId
            })
        }).send(res);
    }
    async createConversation(req, res) {
        return new SuccessResponse({
            message: "Create conversation successfully",
            metadata: await ConversationService.createConversation({
                id: req.User.userId,
                ...req.body,
                file: req.file
            })
        }).send(res);
    }

    async updateConversation(req, res) {
        return new SuccessResponse({
            message: "Update conversation successfully",
            metadata: await ConversationService.updateConversation({
                id: req.User.userId,
                ...req.body,
                file: req.file
            })
        }).send(res);
    }

    async updateMembersToConversation(req, res) {
        return new SuccessResponse({
            message: "Update conversation members successfully",
            metadata: await ConversationService.updateMembersToConversation({
                id: req.User.userId,
                ...req.body
            })
        }).send(res);
    }
}

module.exports = new ConversationController();
