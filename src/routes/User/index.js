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
router.get("/getUserBySearch/:search", asyncHandler(UserController.getUserBySearch));

router.use(authentication);
router.get("/info", asyncHandler(UserController.getUserInfo));
router.post("/update-info", asyncHandler(UserController.updateInfoUser));

router.post("/update-status", asyncHandler(UserController.updateUserStatus));
router.post("/check-password", asyncHandler(UserController.checkPassword));
router.post("/create-password", asyncHandler(UserController.updatePassword));
router.post("/change-password", asyncHandler(UserController.changePassword));
router.post("/edit-profile", upload.single("file"), asyncHandler(UserController.editProfile));

module.exports = router;
