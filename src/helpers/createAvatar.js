const { createCanvas } = require('canvas');
const fs = require('fs');
const { update } = require('lodash');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
require('dotenv').config();
cloudinary.config({
    cloud_name: 'dyj2mpgxi',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
})

const getAvatarInitials = (fullName = '') => {
    const names = fullName.trim().split(' ').filter(Boolean);
    if (names.length === 0) return '';
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

const getColorFromString = (str) => {
    const colors = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#FB7185'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

const generateAvatarImage = async (fullName, size = 128) => {
    const initials = getAvatarInitials(fullName);
    const bgColor = getColorFromString(fullName);
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `${size / 2}px Sans`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size / 2, size / 2);

    const buffer = canvas.toBuffer('image/png');
    return buffer;
}

const uploadBufferToCloudinary = (buffer, fileName = 'avatar') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'avatars',
                public_id: fileName,
                resource_type: 'image',
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );

        const readable = new Readable();
        readable._read = () => { };
        readable.push(buffer);
        readable.push(null);
        readable.pipe(stream);
    });
}

const createAndUploadAvatar = async (fullName) => {
    const buffer = await generateAvatarImage(fullName);
    const url = await uploadBufferToCloudinary(buffer, fullName.replace(/\s/g, '_'));
    return url;
}

const updateAvatar = async(fullName, buffer)=>{
    const url = await uploadBufferToCloudinary(buffer, fullName.replace(/\s/g, '_'));
    return url;
}

module.exports = {
    createAndUploadAvatar,
    updateAvatar,
}