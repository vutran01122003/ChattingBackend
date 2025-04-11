const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByPhoneNumber, createAccount } = require('../models/repositories/user.repo');
const { BadRequestError, AuthFailureError, ForbiddenError } = require('../core/error.response')
const { sendSingleMessage, genSecretKey, getInfoData } = require('../utils')
const { generateOTPToken, verifyOTP } = require('../auth/genOTP');
const { createTokenPair } = require('../auth/authUtils')
const KeyTokenService = require('./keytoken.service');
class AuthenticationService {

    static signUp = async ({ phone }) => {
        console.log("phone::::", phone)
        const user = await findUserByPhoneNumber({ phone, select: ['phone'] });
        if (user) {
            throw new BadRequestError("User already exists");
        }
        const { otp, token } = generateOTPToken({ phone });
        const message = `Mã OTP của bạn là ${otp}`;
        const result = await sendSingleMessage(phone, message)
        if (result) {
            return {
                token
            }
        }
    }
    static verifyOTP = async ({ otp, token }) => {
        const result = verifyOTP({ otp, token });
        if (!result.is_valid) {
            throw new AuthFailureError("Invalid OTP code")
        }
        const newAccount = await createAccount({ phone: result.phone })
        if (!newAccount) {
            throw new BadRequestError("Cannot create account")
        }
        const { publicKey, privateKey } = genSecretKey();
        const tokens = await createTokenPair({ userId: newAccount._id, phone: newAccount.phone }, publicKey, privateKey);
        const keyStore = KeyTokenService.createKeyToken({
            userId: newAccount._id,
            publicKey,
            privateKey,
            refreshToken: tokens.refreshToken
        })
        if (!keyStore) {
            throw new BadRequestError('Error key store')
        }
        return {
            user: getInfoData({ fields: ['full_name', 'phone', '_id'], object: newAccount }),
            tokens
        }
    }
    static handleRefreshToken = async ({ keyStore, refreshToken, User }) => {
        const { userId, phone } = User;
        if (keyStore.refreshTokenUsed.includes(refreshToken)) {
            await KeyTokenService.deleteKeyTokenById(userId);
            throw new ForbiddenError("Something went wrong, please try again!");
        }
        if (keyStore.refreshToken !== refreshToken) throw new AuthFailureError("Invalid refresh token")
        const foundUser = await findUserByPhoneNumber({ phone, select: ['phone', 'full_name'] });
        if (!foundUser) throw new AuthFailureError('Something went wrong !')

        const tokens = await createTokenPair({ userId, phone }, keyStore.publicKey, keyStore.privateKey);
        await keyStore.updateOne({
            $set: {
                refreshToken: tokens.refreshToken,
                accessToken: tokens.accessToken
            },
            $addToSet: {
                refreshTokenUsed: refreshToken
            }
        });
        return {
            user: { ...foundUser },
            tokens
        }
    }
    static logOut = async (keyStore) => {
        const delKey = await KeyTokenService.removeKeyById(keyStore._id);
        return delKey;
    }
    static login = async ({ phone, password }) => {
        const foundUser = await findUserByPhoneNumber({ phone, select: ['phone', 'full_name', 'password', 'is_has_password', '_id'] });
        if (!foundUser) throw new BadRequestError('User not found!');
        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch) throw new AuthFailureError('Unauthorized!');
        const keyStore = await KeyTokenService.findByUserId(foundUser._id);
        if (!keyStore) {
            const { publicKey, privateKey } = genSecretKey();
            const tokens = await createTokenPair({
                userId: foundUser._id,
                phone: foundUser.phone
            }, publicKey, privateKey);
            await KeyTokenService.createKeyToken({
                userId: foundUser._id,
                publicKey,
                privateKey,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            })
            return {
                user: getInfoData({ fields: ['full_name', 'phone', 'is_has_password', '_id'], object: foundUser }),
                tokens 
            }
        }

        return {
            user: getInfoData({ fields: ['full_name', 'phone', 'is_has_password', '_id'], object: foundUser }),
            tokens : {
                accessToken: keyStore.accessToken,
                refreshToken: keyStore.refreshToken
            }
        }
    }

    static introspectToken = async ({ keyStore, User }) => {
        if (!keyStore || !User) throw new AuthFailureError("Invalid request");
        return {
            is_valid: true,
        }
    }


}


module.exports = AuthenticationService;