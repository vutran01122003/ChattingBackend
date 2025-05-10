const express = require("express");
const router = express.Router();
const MessageController = require("../../controllers/message.controller");
const { authentication } = require("../../auth/authUtils");
const asyncHandler = require("../../helpers/asyncHandler");
const upload = require("../../configs/config.multers");

router.use(authentication);

router.get(
    "/conversations/:conversation_id/messages",
    asyncHandler(MessageController.getMessages)
);
router.post("/messages", upload, asyncHandler(MessageController.sendMessage));
router.put(
    "/messages/:message_id/revoke",
    asyncHandler(MessageController.revokeMessage)
);
router.put(
    "/messages/:message_id/delete",
    asyncHandler(MessageController.deleteMessage)
);
router.post(
    "/messages/forward",
    asyncHandler(MessageController.forwardMessage)
);
router.put(
    "/messages/mark-as-read",
    asyncHandler(MessageController.markMessageAsRead)
);
router.post("/messages/reaction", asyncHandler(MessageController.addReaction));
router.delete(
    "/messages/reaction",
    asyncHandler(MessageController.removeReaction)
);
module.exports = router;
