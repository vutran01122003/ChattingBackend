const userModel = require("../user.model");
const { getSelectData, unGetSelectData, convertToObjectId } = require("../../utils");
const { NotFoundError } = require("../../core/error.response");
const bcrypt = require("bcrypt");
const findUserByPhoneNumber = async ({ phone, select }) => {
    return await userModel.findOne({ phone }).select(getSelectData(select)).lean();
};
const createAccount = async ({ phone }) => {
    return await userModel.create({ phone });
};
const updateInfo = async ({ phone, fullName, dateOfBirth, gender, avatarUrl = null }) => {
    const query = {
            phone
        },
        options = { upsert: true, new: true };
    const updateSetHasAvatar = {
            $set: {
                full_name: fullName,
                date_of_birth: new Date(dateOfBirth),
                gender: gender,
                avatar_url: avatarUrl
            }
        },
        updateSet = {
            $set: {
                full_name: fullName,
                date_of_birth: new Date(dateOfBirth),
                gender: gender
            }
        };
    return await userModel
        .updateOne(query, avatarUrl === null ? updateSet : updateSetHasAvatar, options)
        .select(unGetSelectData(["__v", "friends", "is_online", "last_seen"]));
};
const updatePassword = async ({ User, password }) => {
    const { userId } = User;
    const foundUser = await userModel
        .findById({ _id: convertToObjectId(userId) })
        .select(unGetSelectData(["__v", "friends", "is_online", "last_seen"]));
    if (!foundUser) throw new NotFoundError("Something went wrong!");
    let userUpdate = null;
    if (foundUser?.password) {
        throw new BadRequestError("Password already exists!");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    userUpdate = await foundUser.updateOne({ $set: { password: passwordHash, is_has_password: true } }, { new: true });
    if (userUpdate !== null) {
        return userUpdate;
    }
    return null;
};
const changePassword = async ({ userId, password, newPassword }) => {
    const foundUser = await userModel.findById({ _id: convertToObjectId(userId) });
    if (!foundUser) throw new NotFoundError("Something went wrong!");
    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) throw new BadRequestError("Password is incorrect!");
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const userUpdate = await foundUser.updateOne({ $set: { password: passwordHash } }, { new: true });
    if (userUpdate !== null) {
        return userUpdate;
    }
    return null;
};
const checkPassword = async ({ userId, password }) => {
    const foundUser = await userModel.findById({ _id: convertToObjectId(userId) });
    if (!foundUser) throw new NotFoundError("Something went wrong!");
    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) return false;
    return true;
};
const resetPassword = async ({ phone, newPassword }) => {
    const foundUser = await userModel.findOne({ phone });
    if (!foundUser) throw new NotFoundError("Something went wrong!");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const userUpdate = await foundUser.updateOne({ $set: { password: hashedPassword } }, { new: true });
    if (userUpdate !== null) {
        return userUpdate;
    }
    return null;
};
const updateAvatar = async ({ userId, avatarUrl }) => {
    const foundUser = await userModel.findById({ _id: convertToObjectId(userId) });
    if (!foundUser) throw new NotFoundError("Something went wrong!");
    const userUpdate = await foundUser.updateOne({ $set: { avatar_url: avatarUrl } }, { new: true });
    if (userUpdate !== null) {
        return userUpdate;
    }
    return null;
};
module.exports = {
    findUserByPhoneNumber,
    createAccount,
    updateAvatar,
    updateInfo,
    updatePassword,
    changePassword,
    resetPassword,
    checkPassword
};
