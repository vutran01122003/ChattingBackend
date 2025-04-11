require('dotenv').config();
const jwt = require('jsonwebtoken')
const SECRET_KEY = process.env.SECRET_KEY;


const generateOTPToken = ({ phone, expiryMinutes = 1 }) => {
    const otp = Array(6).fill(0).map(_ => Math.floor(Math.random() * 10)).join('');

    const token = jwt.sign({
        phone,
        otp
    }, SECRET_KEY, { expiresIn: `${expiryMinutes}m` });

    return { otp, token };
}

const verifyOTP = ({otp , token}) =>{
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if(decoded.otp === otp){
            return {
                is_valid: true,
                phone: decoded.phone
            }
        }
    }catch(err){
        return {
            is_valid: false
        };
    }
}

module.exports = {
    generateOTPToken,
    verifyOTP
}