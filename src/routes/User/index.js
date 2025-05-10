const express = require("express");
const router = express.Router();
const UserController = require("../../controllers/user.controller");
const { authentication } = require("../../auth/authUtils");
const asyncHandler = require("../../helpers/asyncHandler");
const upload = require("multer")();
router.post("/request-reset-password", asyncHandler(UserController.requestResetPassword));
router.post("/verify-reset-password", asyncHandler(UserController.verifyOTPResetPassword));
router.post("/reset-password", asyncHandler(UserController.resetPassword));
router.get("/getAllUser", asyncHandler(UserController.getAllUser));


router.use(authentication);
router.get("/info", asyncHandler(UserController.getUserInfo));
router.post("/update-info", asyncHandler(UserController.updateInfoUser));
router.get("/getUserBySearch/:search", asyncHandler(UserController.getUserBySearch));
router.post("/update-status", asyncHandler(UserController.updateUserStatus));
router.post("/check-password", asyncHandler(UserController.checkPassword));
router.post("/create-password", asyncHandler(UserController.updatePassword));
router.post("/change-password", asyncHandler(UserController.changePassword));
router.post("/edit-profile", upload.single("file"), asyncHandler(UserController.editProfile));
router.post("/send-friend-request/:friendId", asyncHandler(UserController.sendFriendRequest));
router.post("/cancel-friend-request/:receiverId", asyncHandler(UserController.cancelFriendRequest));
router.post("/decline-friend-request/:senderId", asyncHandler(UserController.declineFriendRequest));
router.post("/accept-friend-request/:senderId", asyncHandler(UserController.acceptFriendRequest));
router.post("/unfriend/:friendId", asyncHandler(UserController.unfriend));
router.get("/check-friendship/:friendId", asyncHandler(UserController.checkFriendShip));
router.get("/check-send-friend-request/:friendId", asyncHandler(UserController.checkSendFriendRequest));
router.get("/check-receive-friend-request/:friendId", asyncHandler(UserController.checkReceiveFriendRequest));
router.get("/get-send-friend-request", asyncHandler(UserController.getSendFriendRequest));
router.get("/get-receive-friend-request", asyncHandler(UserController.getReceiveFriendRequest));
router.get("/get-friend-list", asyncHandler(UserController.getFriendList));

module.exports = router;
