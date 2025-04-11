const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/auth.controller')
const {authentication} = require('../../auth/authUtils')
const asyncHandler = require('../../helpers/asyncHandler')

router.post('/auth/signup', asyncHandler(AuthController.signUp))
router.post('/auth/login', asyncHandler(AuthController.logIn))
router.post('/auth/verify-otp', asyncHandler(AuthController.verifyOTP))
router.use(authentication)
router.post('/auth/logout', asyncHandler(AuthController.logOut))
router.get('/auth/introspect-token', asyncHandler(AuthController.introspectToken))
router.post('/auth/refresh-token', asyncHandler(AuthController.handleRefreshToken))
module.exports = router