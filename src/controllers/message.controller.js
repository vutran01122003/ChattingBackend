const { SuccessResponse } = require("../core/success.response");
const MessageService = require("../services/message.service");

class MessageController {
    async sendMessage(req, res) {
        return new SuccessResponse({
            message: "Send message successfully",
            metadata: await MessageService.sendMessage({
                id: req.User.userId,
                ...req.body,
                files: req.files,
            }),
        }).send(res);
    }
    async getMessages(req, res) {
        return new SuccessResponse({
            message: "Get messages successfully",
            metadata: await MessageService.getMessages({
                id: req.User.userId,
                conversation_id: req.params.conversation_id,
                ...req.query,
            }),
        }).send(res);
    }
    async revokeMessage(req, res) {
        return new SuccessResponse({
            message: "Revoke message successfully",
            metadata: await MessageService.revokeMessage({
                id: req.User.userId,
                message_id: req.params.message_id,
            }),
        }).send(res);
    }
    async deleteMessage(req, res) {
        return new SuccessResponse({
            message: "Delte message successfully",
            metadata: await MessageService.deleteMessage({
                id: req.User.userId,
                message_id: req.params.message_id,
            }),
        }).send(res);
    }
    async forwardMessage(req, res) {
        return new SuccessResponse({
            message: "Foward message successfully",
            metadata: await MessageService.forwardMessage({
                id: req.User.userId,
                ...req.body,
            }),
        }).send(res);
    }
    async markMessageAsRead(req, res) {
        return new SuccessResponse({
            message: "Mark as read successfully",
            metadata: await MessageService.markMessagesAsRead({
                id: req.User.userId,
                conversation_id: req.body.conversation_id,
            }),
        }).send(res);
    }
}

module.exports = new MessageController();
