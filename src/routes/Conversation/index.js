const express = require("express");
const router = express.Router();
const ConversationController = require("../../controllers/conversation.controller");
const { authentication } = require("../../auth/authUtils");
const asyncHandler = require("../../helpers/asyncHandler");
const upload = require("multer")();

router.use(authentication);

router.get("/conversations/:conversation_id", asyncHandler(ConversationController.getUserConversation));
router.get("/conversations", asyncHandler(ConversationController.getAllUserConversations));
router.post("/conversations", upload.single("file"), asyncHandler(ConversationController.createConversation));
module.exports = router;
