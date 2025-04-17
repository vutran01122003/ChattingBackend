require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

cloudinary.config({
    cloud_name: "dyj2mpgxi",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadBufferFileToCloudinary = (buffer, fileName) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "files",
                public_id: fileName,
                resource_type: "auto",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );

        const readable = new Readable();
        readable._read = () => {};
        readable.push(buffer);
        readable.push(null);
        readable.pipe(stream);
    });
};

module.exports = {
    uploadBufferFileToCloudinary,
};
