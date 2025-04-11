const axios = require('axios');
const crypto = require('crypto');
const {Types} = require('mongoose')
const {v4: uuidv4} = require('uuid')
const redis = require('../configs/config.redis')
const _ = require('lodash')
require('dotenv').config()
const SERVER = 'https://admin.freesms.vn';
const API_KEY = process.env.API_KEY_SMS;
const getSelectData = (select = []) => {
    return Object.fromEntries(select.map(e => [e, 1]))
}

const unGetSelectData = (select = []) => {
    return Object.fromEntries(select.map(e => [e, 0]))
}

const getInfoData = ({fields = [], object = {}})=>{
    return _.pick(object, fields)
}
const sendSingleMessage = async (number, message, device = 0, isMMS = false,
    attachments = null, prioritize = false) => {
    const url = `${SERVER}/services/send.php`;
    const postData = {
        number: number,
        message: message,
        key: API_KEY,
        devices: device,
        type: isMMS ? "mms" : "sms",
        attachments: attachments,
        prioritize: prioritize ? 1 : 0
    };

    const data = await sendRequest(url, postData);
    return data.messages[0];
}

const sendRequest = async (url, postData) => {
    try {
        const response = await axios.post(url, new URLSearchParams(postData).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        if (response.status === 200) {
            const json = response.data;

            if (!json) {
                throw new Error("Missing data in request. Please provide all the required information to send messages.");
            }

            if (json.success) {
                return json.data;
            } else {
                throw new Error(json.error?.message || "Unknown error");
            }
        } else {
            throw new Error(`HTTP Error Code: ${response.status}`);
        }
    } catch (error) {
        throw new Error(error.message);
    }
}
const genSecretKey = () =>{
    const publicKey = crypto.randomBytes(64).toString('hex');
    const privateKey = crypto.randomBytes(64).toString('hex');
    return {publicKey, privateKey};
}
const convertToObjectId= id => {
    return new Types.ObjectId(id);
}
const generateQRSession = async () =>{
    const sessionId = uuidv4();
    const sessionData = {
        status: 'pending',
        createdAt: Date.now(),
    };
    try {
        await redis.set(`qr_login:${sessionId}`, JSON.stringify(sessionData), {
            "EX": 180
        })
    } catch (error) {
        console.error('Error setting QR session in Redis:', error);
    }
    return sessionId;
}

module.exports = {
    getSelectData,
    unGetSelectData,
    getInfoData,
    sendSingleMessage,
    genSecretKey,
    convertToObjectId,
    generateQRSession
}