const AuthenticationService = require('../services/auth.service')

const { CREATED, SuccessResponse } = require('../core/success.response')

class AuthController {
    signUp = async (req, res, next) => {
        new SuccessResponse({
            message: "Sign up successfully",
            metadata: await AuthenticationService.signUp(req.body)
        }).send(res)
    }
    verifyOTP = async (req, res, next) => {
        new SuccessResponse({
            message: "Verify OTP successfully",
            metadata: await AuthenticationService.verifyOTP(req.body)
        }).send(res)
    }
    handleRefreshToken = async (req, res, next) => {
        new SuccessResponse({
            message: 'Refresh token successfully',
            metadata: await AuthenticationService.handleRefreshToken({
                keyStore: req.keyStore,
                refreshToken: req.refreshToken, User: req.User
            })
        }).send(res)
    }
    logOut = async (req, res, next) => {
        new SuccessResponse({
            message: 'Logout successfully',
            metadata: await AuthenticationService.logOut(req.keyStore)
        }).send(res)
    }
    logIn = async (req, res, next) => {
        new SuccessResponse({
            message: "Login successfully",
            metadata: await AuthenticationService.login(req.body)
        }).send(res)
    }
    introspectToken = async (req, res, next) => {
        new SuccessResponse({
            message: 'Introspect token successfully',
            metadata: await AuthenticationService.introspectToken({ keyStore: req.keyStore, User: req.User })
        }).send(res)
    }
    generateQR = async (req, res, next) => {
        new SuccessResponse({
            message: 'Generate QR code successfully',
            metadata: await AuthenticationService.generateQRSession()
        }).send(res)
    }
    approveQRLogin = async (req, res, next) => {
        new SuccessResponse({
            message: 'Approve QR login successfully',
            metadata: await AuthenticationService.approveQRLogin({
                userId: req.User.userId,
                sessionId: req.body.sessionId, accessToken: req.body.accessToken, refreshToken: req.body.refreshToken
            })
        }).send(res);
    }
    checkQRLogin = async (req, res, next) => {
        new SuccessResponse({
            message: 'Check QR login successfully',
            metadata: await AuthenticationService.checkQRSession({
                sessionId: req.query.sessionId
            })
        }).send(res);
    }

}

module.exports = new AuthController()