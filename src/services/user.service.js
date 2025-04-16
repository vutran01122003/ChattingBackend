const { BadRequestError } = require("../core/error.response");
const {
    updateInfo,
    updatePassword,
    findUserByPhoneNumber,
    changePassword,
    resetPassword,
    checkPassword
} = require("../models/repositories/user.repo");
const { createAndUploadAvatar, updateAvatar } = require("../helpers/createAvatar");
const { sendSingleMessage } = require("../utils");
const { Buffer } = require("buffer");
const { generateOTPToken, verifyOTP } = require("../auth/genOTP");
class UserService {
    static updateInfo = async ({ phone, fullName, dateOfBirth, gender }) => {
        console.log(dateOfBirth);
        const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
        if (age < 14) throw new BadRequestError("Age must be greater than 14");
        const avatarUrl = await createAndUploadAvatar(fullName);
        if (!avatarUrl) throw new BadRequestError("Cannot create avatar");
        const updateUser = await updateInfo({ phone, fullName, dateOfBirth, gender, avatarUrl });
        if (!updateUser) throw new BadRequestError("Cannot update user");
        return updateUser;
    };
    static editProfile = async ({ phone, fullName, dateOfBirth, gender, base64, file }) => {
        const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
        // if (age < 14) throw new BadRequestError("Age must be greater than 14");

        let avatarUrl = null;

        if (base64 || file) {
            const buffer = base64 ? Buffer.from(base64, "base64") : file?.buffer;
            if (!buffer) throw new BadRequestError("Invalid image data");

            avatarUrl = await updateAvatar(fullName, buffer);
            if (!avatarUrl) throw new BadRequestError("Cannot create avatar");
        }

        const updateUser = await updateInfo({
            phone,
            fullName,
            dateOfBirth,
            gender,
            ...(avatarUrl && { avatarUrl })
        });

        if (!updateUser) throw new BadRequestError("Cannot update user");

        return updateUser;
    };
    static updatePassword = async ({ User, password }) => {
        return await updatePassword({ User, password });
    };
    static getUserByPhone = async ({ phone }) => {
        const foundUser = await findUserByPhoneNumber({
            phone,
            select: ["phone", "full_name", "is_has_password", "avatar_url", "date_of_birth", "gender"]
        });
        if (!foundUser) throw new BadRequestError("Cannot find user");
        return foundUser;
    };
    static changePassword = async ({ User, password, newPassword }) => {
        return await changePassword({ userId: User.userId, phone: User.phone, password, newPassword });
    };
    static requestResetPassword = async ({ phone }) => {
        const foundUser = await findUserByPhoneNumber({ phone, select: ["phone", "full_name", "is_has_password"] });
        if (!foundUser) throw new BadRequestError("Cannot find user");
        const { otp, token } = generateOTPToken({ phone });
        const message = `Mã OTP để lấy lại mật khẩu là: ${otp}`;
        const result = await sendSingleMessage(phone, message);
        if (result) {
            return {
                token
            };
        }
        throw new BadRequestError("Cannot send OTP code");
    };
    static verifyOTPResetPassword = async ({ otp, token }) => {
        const result = verifyOTP({ otp, token });
        if (!result.is_valid) {
            throw new AuthFailureError("Invalid OTP code");
        }
        return {
            phone: result.phone,
            result: result.is_valid
        };
    };
    static resetPassword = async ({ phone, newPassword }) => {
        console.log({ phone, newPassword });
        const { modifiedCount } = await resetPassword({ phone, newPassword });
        if (modifiedCount === 0) {
            throw new BadRequestError("Cannot reset password");
        }
        return modifiedCount;
    };
    static updateAvatar = async ({ phone, avatarUrl }) => {
        const foundUser = await findUserByPhoneNumber({
            phone,
            select: ["phone", "full_name", "is_has_password", "avatar_url"]
        });
        if (!foundUser) throw new BadRequestError("Cannot find user");
        const updateUser = await updateAvatar({ phone, avatarUrl });
        if (!updateUser) throw new BadRequestError("Cannot update avatar");
        return updateUser;
    };
    static checkPassword = async ({ userId, password }) => {
        const result = await checkPassword({ userId, password });
        if (!result) return { is_valid: false };

        return { is_valid: true };
    };
}

module.exports = UserService;
