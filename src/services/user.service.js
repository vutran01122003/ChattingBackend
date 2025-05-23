const { BadRequestError, NotFoundError } = require("../core/error.response");
const {
    updateInfo,
    updatePassword,
    findUserByPhoneNumber,
    changePassword,
    resetPassword,
    checkPassword,
    getAllUser,
    getUserBySearch,
    updateUserStatus,
    declineFriendRequest,
    acceptFriendRequest,
    sendFriendRequest,
    cancelFriendRequest,
    unfriend,
    checkFriendShip,
    checkSendFriendRequest,
    checkReceiveFriendRequest,
    getSendFriendRequest,
    getReceiveFriendRequest,
    getFriendList
} = require("../models/repositories/user.repo");
const { createAndUploadAvatar, updateAvatar } = require("../helpers/createAvatar");
const { sendSingleMessage } = require("../utils");
const { Buffer } = require("buffer");
const { generateOTPToken, verifyOTP } = require("../auth/genOTP");

const { console } = require("inspector");
class UserService {
    static updateInfo = async ({ phone, fullName, dateOfBirth, gender }) => {
        const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
        if (age < 14) throw new BadRequestError("Age must be greater than 14");
        const avatarUrl = await createAndUploadAvatar(fullName);
        if (!avatarUrl) throw new BadRequestError("Cannot create avatar");
        const updateUser = await updateInfo({ phone, fullName, dateOfBirth, gender, avatarUrl });
        if (!updateUser) throw new BadRequestError("Cannot update user");
        return updateUser;
    };
    static editProfile = async ({ phone, fullName, dateOfBirth, gender, base64, file }) => {
        console.log(dateOfBirth);
        const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
        if (age < 14) throw new BadRequestError("Age must be greater than 14");

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
    static getAllUser = async () => {
        const foundUser = await getAllUser();
        if (!foundUser) throw new BadRequestError("Cannot find user");
        return foundUser;
    };
    static getUserBySearch = async ({ search, userId, forGroup }) => {
        const foundUser = await getUserBySearch({ search, userId, forGroup });
        if (!foundUser) throw new BadRequestError("Cannot find user");
        return foundUser;
    };

    static updateUserStatus = async ({ userId, status = false, last_seen = new Date() }) => {
        try {
            const result = await updateUserStatus(userId, status, last_seen);

            if (!result) throw new BadRequestError("Cannot update user status");
            return result;
        } catch (error) {
            console.log(error);
        }
    };

    static sendFriendRequest = async ({ phone, friendId }) => {
        const result = await sendFriendRequest({ phone, friendId });
        if (!result) throw new BadRequestError("Cannot send friend request");
        return result;
    };
    static cancelFriendRequest = async ({ senderId, receiverId }) => {
        const result = await cancelFriendRequest({ senderId, receiverId });
        if (!result) throw new BadRequestError("Cannot cancel friend request");
        return result;
    };
    static declineFriendRequest = async ({ receiverId, senderId }) => {
        const result = await declineFriendRequest({ receiverId, senderId });
        if (!result) throw new BadRequestError("Cannot decline friend request");
        return result;
    };
    static acceptFriendRequest = async ({ receiverId, senderId }) => {
        const result = await acceptFriendRequest({ receiverId, senderId });
        console.log(result);
        if (!result) throw new BadRequestError("Cannot add friend");
        return result;
    };
    static unfriend = async ({ phone, friendId }) => {
        const result = await unfriend({ phone, friendId });
        if (!result) throw new BadRequestError("Cannot unfriend");
        return result;
    };
    static checkFriendShip = async ({ phone, friendId }) => {
        const result = await checkFriendShip({ phone, friendId });
        if (!result) throw new BadRequestError("Cannot check friendship");
        return result;
    };
    static checkSendFriendRequest = async ({ phone, friendId }) => {
        const result = await checkSendFriendRequest({ phone, friendId });
        if (!result) throw new BadRequestError("Cannot check send friend request");
        return result;
    };
    static checkReceiveFriendRequest = async ({ phone, friendId }) => {
        const result = await checkReceiveFriendRequest({ phone, friendId });
        if (!result) throw new BadRequestError("Cannot check receive friend request");
        return result;
    };
    static getSendFriendRequest = async ({ phone }) => {
        const result = await getSendFriendRequest({ phone });
        if (!result) throw new BadRequestError("Cannot get send friend request");
        return result;
    };
    static getReceiveFriendRequest = async ({ phone }) => {
        const result = await getReceiveFriendRequest({ phone });
        if (!result) throw new BadRequestError("Cannot get receive friend request");
        return result;
    };
    static getFriendList = async ({ phone }) => {
        const result = await getFriendList({ phone });
        if (!result) throw new BadRequestError("Cannot get friend list");
        return result;
    };
}

module.exports = UserService;
