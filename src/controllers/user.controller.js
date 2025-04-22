const UserService = require("../services/user.service");

const { CREATED, SuccessResponse } = require("../core/success.response");

class UserController {
    updateInfoUser = async (req, res, next) => {
        return new SuccessResponse({
            message: "Update user successfully",
            metadata: await UserService.updateInfo({
                phone: req.User.phone,
                ...req.body
            })
        }).send(res);
    };
    updatePassword = async (req, res, next) => {
        return new SuccessResponse({
            message: "Update password successfully",
            metadata: await UserService.updatePassword({
                User: req.User,
                password: req.body.password
            })
        }).send(res);
    };
    getUserInfo = async (req, res, next) => {
        new SuccessResponse({
            message: "Get user info successfully",
            metadata: await UserService.getUserByPhone({
                phone: req.User.phone
            })
        }).send(res);
    };
    changePassword = async (req, res, next) => {
        new SuccessResponse({
            message: "Change password successfully",
            metadata: await UserService.changePassword({
                User: req.User,
                password: req.body.password,
                newPassword: req.body.newPassword
            })
        }).send(res);
    };
    requestResetPassword = async (req, res, next) => {
        return new SuccessResponse({
            message: "Request reset password successfully",
            metadata: await UserService.requestResetPassword({
                phone: req.body.phone
            })
        }).send(res);
    };
    verifyOTPResetPassword = async (req, res, next) => {
        return new SuccessResponse({
            message: "Verify OTP code successfully",
            metadata: await UserService.verifyOTPResetPassword({
                otp: req.body.otp,
                token: req.body.token
            })
        }).send(res);
    };
    resetPassword = async (req, res, next) => {
        return new SuccessResponse({
            message: "Reset password successfully",
            metadata: await UserService.resetPassword({
                phone: req.body.phone,
                newPassword: req.body.newPassword
            })
        }).send(res);
    };
    editProfile = async (req, res, next) => {
        return new SuccessResponse({
            message: "Edit profile successfully",
            metadata: await UserService.editProfile({
                phone: req.User.phone,
                fullName: req.body.fullName,
                dateOfBirth: req.body.dateOfBirth,
                gender: req.body.gender,
                base64: req.body.base64,
                file: req.file
            })
        }).send(res);
    };
    checkPassword = async (req, res, next) => {
        return new SuccessResponse({
            message: "Check password successfully",
            metadata: await UserService.checkPassword({ userId: req.User.userId, password: req.body.password })
        }).send(res);
    };
    getAllUser = async (req, res, next) => {
        return new SuccessResponse({
            message: "Get all user successfully",
            metadata: await UserService.getAllUser()
        }).send(res);
    };
    getUserBySearch = async (req, res, next) => {
        return new SuccessResponse({
            message: "Get user by search successfully",
            metadata: await UserService.getUserBySearch({ search: req.params.search })
        }).send(res);
    };
    updateUserStatus = async (req, res, next) => {
        return new SuccessResponse({
            message: "Update user status successfully",
            metadata: await UserService.updateUserStatus({
                userId: req.User.userId,
                ...req.body
            })
        }).send(res);
    };
}

module.exports = new UserController();
