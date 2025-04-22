const jwt = require("jsonwebtoken");
const asyncHandler = require("../helpers/asyncHandler");
const { AuthFailureError, BadRequestError, NotFoundError, ForbiddenError } = require("../core/error.response");
const { findUserById } = require("../models/repositories/user.repo");
const KeyTokenService = require("../services/keytoken.service");

const HEADER = {
    CLIENT_ID: "x-client-id",
    AUTHORIZATION: "authorization",
    REFRESHTOKEN: "refresh-token"
};

const createTokenPair = async (payload, publicKey, privateKey) => {
    try {
        const accessToken = await jwt.sign(payload, publicKey, {
            expiresIn: "2 days"
        });
        const refreshToken = await jwt.sign(payload, privateKey, {
            expiresIn: "7 days"
        });
        return {
            accessToken,
            refreshToken
        };
    } catch (error) {
        throw new BadRequestError("Error signing token");
    }
};

const authentication = asyncHandler(async (req, res, next) => {
    const userId = req.headers[HEADER.CLIENT_ID];
    if (!userId) throw new AuthFailureError("Invalid request");
    const keyStore = await KeyTokenService.findByUserId(userId);
    if (!keyStore) throw new NotFoundError("Key store not found");
    if (req.headers[HEADER.REFRESHTOKEN]) {
        const refreshToken = req.headers[HEADER.REFRESHTOKEN];
        try {
            const decodedUser = jwt.verify(refreshToken, keyStore.privateKey);
            if (userId !== decodedUser.userId) throw new AuthFailureError("Invalid user");
            req.keyStore = keyStore;
            req.User = decodedUser;
            req.refreshToken = refreshToken;
            req.tokenVersion = decodedUser.tokenVersion;
            return next();
        } catch (err) {
            throw err;
        }
    }
    const accessToken = req.headers[HEADER.AUTHORIZATION];
    if (!accessToken) throw new AuthFailureError("Invalid request");
    try {
        const decodedUser = jwt.verify(accessToken, keyStore.publicKey);
        if (userId !== decodedUser.userId) throw new AuthFailureError("Invalid user");
        const foundUser = await findUserById({ userId });
        if (foundUser.token_version !== decodedUser.tokenVersion)
            throw new ForbiddenError("Password changed! Please login again");
        req.keyStore = keyStore;
        req.User = decodedUser;
        return next();
    } catch (error) {
        throw error;
    }
});

const verifyJWT = async (token, keySecret) => {
    return await jwt.verify(token, keySecret);
};

module.exports = {
    createTokenPair,
    authentication,
    verifyJWT
};
