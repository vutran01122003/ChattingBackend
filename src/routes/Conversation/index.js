const express = require("express");
const router = express.Router();
const ConversationController = require("../../controllers/conversation.controller");
const { authentication } = require("../../auth/authUtils");
const asyncHandler = require("../../helpers/asyncHandler");

router.use(authentication);

router.get(
    "/conversations",
    asyncHandler(ConversationController.getUserConversations)
);
router.post(
    "/conversations",
    asyncHandler(ConversationController.createOrGetConversation)
);
module.exports = router;
