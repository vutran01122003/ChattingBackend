const express = require("express");
const router = express.Router();
const AuthController = require("../../controllers/auth.controller");
const { authentication } = require("../../auth/authUtils");
const asyncHandler = require("../../helpers/asyncHandler");

router.get("/auth/generateQRSession", asyncHandler(AuthController.generateQR));
router.get("/auth/checkQRSession", asyncHandler(AuthController.checkQRLogin));
router.post("/auth/signup", asyncHandler(AuthController.signUp));
router.post("/auth/login", asyncHandler(AuthController.logIn));
router.post("/auth/verify-otp", asyncHandler(AuthController.verifyOTP));
router.use(authentication);
router.post("/auth/logout", asyncHandler(AuthController.logOut));
router.get("/auth/introspect-token", asyncHandler(AuthController.introspectToken));
router.get("/auth/user-info", asyncHandler(AuthController.getUserDataByToken));
router.post("/auth/refresh-token", asyncHandler(AuthController.handleRefreshToken));
router.post("/auth/approveQRLogin", asyncHandler(AuthController.approveQRLogin));
module.exports = router;
