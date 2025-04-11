const keytokenModel = require("../models/keytoken.model");
const {Types} = require('mongoose');
const {convertToObjectId} = require('../utils')
class KeyTokenService {
    static createKeyToken = async ({ userId, publicKey, privateKey, accessToken, refreshToken }) => {
        try {
            const filter = {user: userId}, update = 
            {publicKey, privateKey, refreshTokenUsed: [], accessToken ,refreshToken},
            options = {upsert: true, new: true}
            const tokens = await keytokenModel.findOneAndUpdate(filter, update, options)
            return tokens ? tokens.publicKey : null;  
        } catch (error) {
            return error;
        }
    }
    static findByUserId = async(userId) => {
        return await keytokenModel.findOne({user: new Types.ObjectId(userId)})
    }
    static removeKeyById = async(id)=>{
        return await keytokenModel.deleteOne({_id: id});
    }
    static findByRefreshTokenUsed = async(refreshToken)=>{
        return await keytokenModel.findOne({refreshTokenUsed:{$in:[refreshToken]}}).lean();    
    }
    static findByRefreshToken = async(refreshToken)=>{
        return await keytokenModel.findOne({refreshToken});    
    }
    static deleteKeyTokenById = async(userId) =>{
        return await keytokenModel.deleteOne({user: convertToObjectId(userId)}).lean();
    }
}

module.exports = KeyTokenService;