const userModel = require('../user.model')
const { getSelectData, unGetSelectData, convertToObjectId, genSecretKey } = require('../../utils');
const { NotFoundError } = require('../../core/error.response')
const bcrypt = require('bcrypt')
const keytokenModel = require('../keytoken.model');
const jwt = require('jsonwebtoken');
const findUserByPhoneNumber = async ({ phone, select }) => {
    return await userModel.findOne({ phone }).select(getSelectData(select)).lean()
}
const createAccount = async ({ phone }) => {
    return await userModel.create({ phone })
}
const updateInfo = async ({ phone, fullName, dateOfBirth, gender, avatarUrl = null }) => {
    const query = {
        phone
    }, options = { upsert: true, new: true }
    const updateSetHasAvatar = {
        $set: {
            full_name: fullName,
            date_of_birth: new Date(dateOfBirth),
            gender: gender,
            avatar_url: avatarUrl
        }
    }, updateSet = {
        $set: {
            full_name: fullName,
            date_of_birth: new Date(dateOfBirth),
            gender: gender,
        }
    }
    return await userModel.updateOne(query, avatarUrl === null ? updateSet : updateSetHasAvatar, options)
        .select(unGetSelectData(['__v', 'friends', 'is_online', 'last_seen']));
}
const updatePassword = async ({ User, password }) => {
    const { userId } = User;
    const foundUser = await userModel.findById({ _id: convertToObjectId(userId) })
        .select(unGetSelectData(['__v', 'friends', 'is_online', 'last_seen']));
    if (!foundUser) throw new NotFoundError('Something went wrong!');
    let userUpdate = null;
    if (foundUser?.password) {
        throw new BadRequestError('Password already exists!');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    userUpdate = await foundUser.updateOne({ $set: { password: passwordHash, is_has_password: true } }, { new: true })
    if (userUpdate !== null) {
        return userUpdate;
    }
    return null;
}
const changePassword = async ({ userId, phone, password, newPassword }) => {
    const foundUser = await userModel.findById({ _id: convertToObjectId(userId) })
    if (!foundUser) throw new NotFoundError('Something went wrong!');
    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) throw new BadRequestError('Password is incorrect!');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const userUpdate = await userModel.findOneAndUpdate(
        { _id: foundUser._id },
        {
            $set: { password: passwordHash },
            $inc: { token_version: 1 }
        },
        { new: true }
    ).select(unGetSelectData(['__v', 'friends', 'is_online', 'last_seen', 'password']));;
    if (userUpdate !== null) {
        const keyStore = await keytokenModel.findOne({ user: convertToObjectId(userId) });
        if (keyStore) {
            const payload = { userId, phone, tokenVersion: userUpdate.token_version }
            const { publicKey, privateKey } = genSecretKey();
            const accessToken = await jwt.sign(payload, publicKey, { expiresIn: '2 days' });
            const refreshToken = await jwt.sign(payload, privateKey, { expiresIn: '7 days' });
            await keyStore.updateOne({
                $set: {
                    refreshToken: refreshToken,
                    accessToken: accessToken,
                    publicKey,
                    privateKey
                },
            });

            return {
                user: userUpdate,
                tokens: {
                    accessToken: accessToken,
                    refreshToken: refreshToken
                }
            };
        }
    } else {
        throw new BadRequestError('Cannot change password');
    }
    return null;
}
const checkPassword = async ({ userId, password }) => {
    const foundUser = await userModel.findById({ _id: convertToObjectId(userId) })
    if (!foundUser) throw new NotFoundError('Something went wrong!');
    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) return false;
    return true;
}
const resetPassword = async ({ phone, newPassword }) => {
    const foundUser = await userModel.findOne({ phone });
    if (!foundUser) throw new NotFoundError('Something went wrong!');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const userUpdate = await foundUser.updateOne({ $set: { password: hashedPassword } }, { new: true })
    if (userUpdate !== null) {
        return userUpdate;
    }
    return null;
}
const updateAvatar = async ({ userId, avatarUrl }) => {
    const foundUser = await userModel.findById({ _id: convertToObjectId(userId) })
    if (!foundUser) throw new NotFoundError('Something went wrong!');
    const userUpdate = await foundUser.updateOne({ $set: { avatar_url: avatarUrl } }, { new: true })
    if (userUpdate !== null) {
        return userUpdate;
    }
    return null;
}
const findUserById = async ({ userId }) => {
    const foundUser = await userModel.findById({ _id: userId }).lean();
    return foundUser;
}
const getAllUser = async () => {
    const foundUser = await userModel.find({}).select(unGetSelectData(['__v', 'friends', 'is_online', 'last_seen'])).lean()
    if (!foundUser) throw new NotFoundError('Something went wrong!');
    return foundUser;
}

const getUserBySearch = async ({ search }) => {
    const foundUser = await userModel.find({
        $or: [
            { phone: { $regex: search, $options: 'i' } },
            { full_name: { $regex: search, $options: 'i' } },
        ]
    }).select(unGetSelectData(['__v', 'friends', 'is_online', 'last_seen'])).lean()
    if (!foundUser) throw new NotFoundError('Something went wrong!');
    return foundUser;
}


module.exports = {
    findUserByPhoneNumber,
    createAccount,
    updateAvatar,
    updateInfo,
    updatePassword,
    changePassword,
    resetPassword,
    checkPassword,
    findUserById,
    getAllUser,
    getUserBySearch
}