const userModel = require("../user.model");
const Message = require("../message.model");
const { getSelectData, unGetSelectData, convertToObjectId, genSecretKey } = require("../../utils");
const { NotFoundError } = require("../../core/error.response");
const bcrypt = require("bcrypt");
const keytokenModel = require("../keytoken.model");
const jwt = require("jsonwebtoken");
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
        .findOneAndUpdate(query, avatarUrl === null ? updateSet : updateSetHasAvatar, options)
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
const changePassword = async ({ userId, phone, password, newPassword }) => {
    const foundUser = await userModel.findById({
        _id: convertToObjectId(userId)
    });
    if (!foundUser) throw new NotFoundError("Something went wrong!");
    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) throw new BadRequestError("Password is incorrect!");
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const userUpdate = await userModel
        .findOneAndUpdate(
            { _id: foundUser._id },
            {
                $set: { password: passwordHash },
                $inc: { token_version: 1 }
            },
            { new: true }
        )
        .select(unGetSelectData(["__v", "friends", "is_online", "last_seen", "password"]));
    if (userUpdate !== null) {
        const keyStore = await keytokenModel.findOne({
            user: convertToObjectId(userId)
        });
        if (keyStore) {
            const payload = {
                userId,
                phone,
                tokenVersion: userUpdate.token_version
            };
            const { publicKey, privateKey } = genSecretKey();
            const accessToken = await jwt.sign(payload, publicKey, {
                expiresIn: "2 days"
            });
            const refreshToken = await jwt.sign(payload, privateKey, {
                expiresIn: "7 days"
            });
            await keyStore.updateOne({
                $set: {
                    refreshToken: refreshToken,
                    accessToken: accessToken,
                    publicKey,
                    privateKey
                }
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
        throw new BadRequestError("Cannot change password");
    }
    return null;
};
const checkPassword = async ({ userId, password }) => {
    const foundUser = await userModel.findById({
        _id: convertToObjectId(userId)
    });
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
    const foundUser = await userModel.findById({
        _id: convertToObjectId(userId)
    });
    if (!foundUser) throw new NotFoundError("Something went wrong!");
    const userUpdate = await foundUser.updateOne({ $set: { avatar_url: avatarUrl } }, { new: true });
    if (userUpdate !== null) {
        return userUpdate;
    }
    return null;
};
const findUserById = async ({ userId }) => {
    const foundUser = await userModel.findById({ _id: userId }).lean();
    return foundUser;
};
const getAllUser = async () => {
    const foundUser = await userModel
        .find({})
        .select(unGetSelectData(["__v", "friends", "is_online", "last_seen"]))
        .lean();
    if (!foundUser) throw new NotFoundError("Something went wrong!");
    return foundUser;
};

const getUserBySearch = async ({ search, userId, forGroup }) => {
    if (!search || typeof search !== "string") throw new Error("Invalid search term");

    const currentUser = await userModel.findById(userId).lean();
    if (!currentUser) throw new NotFoundError("Người dùng không tồn tại.");

    if (/^\d{8,15}$/.test(search)) {
        const friends = currentUser.friends;
        const exactUser = await userModel.find({ phone: search }).lean();

        console.log({
            friends,
            exactUser: exactUser[0]._id,
            forGroup
        });

        if (forGroup && !friends.find((friendId) => friendId.toString() === exactUser[0]._id.toString()))
            throw new NotFoundError("Không tìm thấy người dùng nào.");

        if (!exactUser || exactUser.length === 0) throw new NotFoundError("Không tìm thấy người dùng nào.");
        return exactUser;
    }

    const friends = currentUser.friends || [];

    const messages = await Message.find({
        $or: [{ read_by: userId }, { sender: userId }]
    }).lean();

    const messagedUsers = messages.map((msg) => msg.sender.toString()).filter((id) => id !== userId);

    const searchUserIds = [...new Set([...friends, ...messagedUsers])];
   
    const foundUsers = await userModel
        .find({
            _id: { $in: searchUserIds },
            full_name: { $regex: search, $options: "i" }
        })
        .lean();

    if (!foundUsers || foundUsers.length === 0) throw new NotFoundError("Không tìm thấy người phù hợp.");
    return foundUsers;
};

const updateUserStatus = async (userId, status, last_seen) => {
    const foundUser = await userModel.findByIdAndUpdate({ _id: userId }, { is_online: status, last_seen });

    return foundUser;
};

const sendFriendRequest = async ({ phone, friendId }) => {
    const sender = await userModel.findOne({ phone });
    if (!sender) throw new BadRequestError("Sender not found");

    const receiver = await userModel.findById({
        _id: convertToObjectId(friendId)
    });

    if (!receiver) throw new BadRequestError("Receiver not found");

    if (!Array.isArray(receiver.friendRequests)) {
        receiver.friendRequests = [];
    }
    const existingRequest = receiver.friendRequests.find((req) => req._id.toString() === sender._id.toString());
    if (existingRequest) throw new BadRequestError("You have already sent a friend request");

    receiver.friendRequests.push(sender._id);

    if (!Array.isArray(sender.sentRequests)) {
        sender.sentRequests = [];
    }

    sender.sentRequests.push(receiver._id);

    await receiver.save();
    await sender.save();

    return { message: "Friend request sent successfully." };
};

const cancelFriendRequest = async ({ senderId, receiverId }) => {
    const receiver = await await userModel.findById(receiverId);
    if (!receiver) throw new BadRequestError("Receiver not found");

    if (!Array.isArray(receiver.friendRequests)) {
        receiver.friendRequests = [];
    }
    const request = receiver.friendRequests.some((req) => req.equals(senderId));
    if (!request) throw new BadRequestError("Friend request not found");

    receiver.friendRequests = receiver.friendRequests.filter((friendRequest) => friendRequest.toString() !== senderId);

    const sender = await userModel.findById(senderId);
    if (!sender) throw new BadRequestError("Sender not found");

    if (!Array.isArray(sender.sentRequests)) {
        sender.sentRequests = [];
    }
    const sentRequest = sender.sentRequests.some((req) => req.equals(receiverId));

    if (!sentRequest) throw new BadRequestError("Sent request not found");

    sender.sentRequests = sender.sentRequests.filter(
        (friendRequest) => friendRequest.toString() !== receiver._id.toString()
    );

    await sender.save();
    await receiver.save();

    return { message: "Friend request cancel successfully." };
};

const declineFriendRequest = async ({ receiverId, senderId }) => {
    const receiver = await await userModel.findById(receiverId);
    if (!receiver) throw new BadRequestError("Receiver not found");

    if (!Array.isArray(receiver.friendRequests)) {
        receiver.friendRequests = [];
    }
    const request = receiver.friendRequests.some((req) => req.equals(senderId));
    if (!request) throw new BadRequestError("Friend request not found");

    receiver.friendRequests = receiver.friendRequests.filter((friendRequest) => friendRequest.toString() !== senderId);

    const sender = await userModel.findById(senderId);
    if (!sender) throw new BadRequestError("Sender not found");

    if (!Array.isArray(sender.sentRequests)) {
        sender.sentRequests = [];
    }
    const sentRequest = sender.sentRequests.some((req) => req.equals(receiverId));

    if (!sentRequest) throw new BadRequestError("Sent request not found");

    sender.sentRequests = sender.sentRequests.filter(
        (friendRequest) => friendRequest.toString() !== receiver._id.toString()
    );

    await sender.save();
    await receiver.save();

    return { message: "Friend request decline successfully." };
};

const acceptFriendRequest = async ({ receiverId, senderId }) => {
    const receiver = await userModel.findById(receiverId);
    console.log(receiverId, senderId);
    if (!receiver) throw new BadRequestError("Receiver not found");

    if (!Array.isArray(receiver.friendRequests)) {
        receiver.friendRequests = [];
    }
    const request = receiver.friendRequests.some((req) => req.equals(senderId));
    if (!request) throw new BadRequestError("Friend request not found");

    receiver.friendRequests = receiver.friendRequests.filter((friendRequest) => friendRequest.toString() !== senderId);

    const sender = await userModel.findById(senderId);
    console.log(senderId, receiverId);
    if (!sender) throw new BadRequestError("Sender not found");

    if (!Array.isArray(sender.sentRequests)) {
        sender.sentRequests = [];
    }
    const sentRequest = sender.sentRequests.some((req) => req.equals(receiverId));

    if (!sentRequest) throw new BadRequestError("Sent request not found");

    sender.sentRequests = sender.sentRequests.filter(
        (friendRequest) => friendRequest.toString() !== receiver._id.toString()
    );

    if (!Array.isArray(receiver.friends)) {
        receiver.friends = [];
    }
    const isFriendForReceiver = receiver.friends.find((friend) => friend.toString() === senderId.toString());
    if (isFriendForReceiver) throw new BadRequestError("You are already friends");

    if (!Array.isArray(sender.friends)) {
        sender.friends = [];
    }
    const isFriendForSender = sender.friends.find((friend) => friend.toString() === receiverId.toString());
    if (isFriendForSender) throw new BadRequestError("You are already friends");

    receiver.friends.push(senderId);
    sender.friends.push(receiverId);
    await sender.save();
    await receiver.save();

    return { message: "Friend request accepted successfully." };
};

const unfriend = async ({ phone, friendId }) => {
    const sender = await userModel.findOne({ phone });
    if (!sender) throw new BadRequestError("Sender not found");

    const receiver = await userModel.findById({
        _id: convertToObjectId(friendId)
    });
    if (!receiver) throw new BadRequestError("Receiver not found");
    console.log(sender, receiver);
    console.log(sender.phone, receiver.phone);

    if (!Array.isArray(sender.friends)) {
        sender.friends = [];
    }

    const isFriendForSender = sender.friends.some((friend) => friend.equals(friendId));
    if (!isFriendForSender) throw new BadRequestError("You are not friends");

    if (!Array.isArray(receiver.friends)) {
        receiver.friends = [];
    }
    const isFriendForReceiver = receiver.friends.some((friend) => friend.equals(sender._id));
    if (!isFriendForReceiver) throw new BadRequestError("Receiver is not friends with you");

    receiver.friends = receiver.friends.filter((friend) => friend.toString() !== sender._id.toString());

    sender.friends = sender.friends.filter((friend) => friend.toString() !== friendId.toString());

    await receiver.save();
    await sender.save();

    return { message: "Unfriended successfully." };
};

const checkFriendShip = async ({ phone, friendId }) => {
    const sender = await userModel.findOne({ phone });
    if (!sender) throw new BadRequestError("Sender not found");

    const receiver = await userModel.findById({
        _id: convertToObjectId(friendId)
    });
    if (!receiver) throw new BadRequestError("Receiver not found");

    if (!Array.isArray(sender.friends)) {
        sender.friends = [];
    }

    const isFriendForSender = sender.friends.some((friend) => friend.equals(friendId));
    if (!isFriendForSender) {
        return { isFriend: false, message: "They are not friends." };
    }

    if (!Array.isArray(receiver.friends)) {
        receiver.friends = [];
    }
    const isFriendForReceiver = receiver.friends.some((friend) => friend.equals(sender._id));
    if (!isFriendForReceiver) {
        return { isFriend: false, message: "They are not friends." };
    }

    return { isFriend: true, message: "They are friends." };
};

const checkSendFriendRequest = async ({ phone, friendId }) => {
    const sender = await userModel.findOne({ phone });
    if (!sender) throw new BadRequestError("Sender not found");

    const receiver = await userModel.findById({
        _id: convertToObjectId(friendId)
    });
    if (!receiver) throw new BadRequestError("Receiver not found");

    if (!Array.isArray(sender.sentRequests)) {
        sender.sentRequests = [];
    }
    const isSentRequestForSender = sender.sentRequests.some((friend) => friend.equals(friendId));
    if (!isSentRequestForSender) {
        return {
            isSentRequest: false,
            message: "You have not sent a friend request."
        };
    }
    return { isSentRequest: true, message: "You have sent a friend request." };
};

const checkReceiveFriendRequest = async ({ phone, friendId }) => {
    const sender = await userModel.findById({
        _id: convertToObjectId(friendId)
    });
    if (!sender) throw new BadRequestError("Sender not found");
    const receiver = await userModel.findOne({ phone });
    if (!receiver) throw new BadRequestError("Receiver not found");
    if (!Array.isArray(receiver.friendRequests)) {
        receiver.friendRequests = [];
    }
    const isReceiveRequestForReceiver = receiver.friendRequests.some((friend) => friend.equals(friendId));
    if (!isReceiveRequestForReceiver) {
        return {
            isReceiveRequest: false,
            message: "You have not received a friend request."
        };
    }
    return {
        isReceiveRequest: true,
        message: "You have received a friend request."
    };
};

const getSendFriendRequest = async ({ phone }) => {
    const findUser = await userModel.findOne({ phone });
    if (!findUser) throw new BadRequestError("Sender not found");
    if (!Array.isArray(findUser.sentRequests)) {
        findUser.sentRequests = [];
    }
    const sendFriendRequest = await userModel.find({ _id: { $in: findUser.sentRequests } }).lean();
    if (!sendFriendRequest) throw new NotFoundError("Something went wrong!");
    return sendFriendRequest;
};

const getReceiveFriendRequest = async ({ phone }) => {
    const findUser = await userModel.findOne({ phone });
    if (!findUser) throw new BadRequestError("Sender not found");
    if (!Array.isArray(findUser.friendRequests)) {
        findUser.friendRequests = [];
    }
    const receiveFriendRequest = await userModel.find({ _id: { $in: findUser.friendRequests } }).lean();
    if (!receiveFriendRequest) throw new NotFoundError("Something went wrong!");
    return receiveFriendRequest;
};

const getFriendList = async ({ phone }) => {
    const findUser = await userModel.findOne({ phone });
    if (!findUser) throw new BadRequestError("User not found");
    if (!Array.isArray(findUser.friends)) {
        findUser.friends = [];
    }
    const friendList = await userModel.find({ _id: { $in: findUser.friends } }).lean();
    if (!friendList) throw new NotFoundError("Something went wrong!");
    return friendList;
};

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
    getUserBySearch,
    acceptFriendRequest,
    sendFriendRequest,
    cancelFriendRequest,
    declineFriendRequest,
    unfriend,
    checkFriendShip,
    checkSendFriendRequest,
    checkReceiveFriendRequest,
    getSendFriendRequest,
    getReceiveFriendRequest,
    getFriendList,
    updateUserStatus
};
