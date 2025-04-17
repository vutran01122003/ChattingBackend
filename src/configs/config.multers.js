const multer = require("multer");
const path = require("path");

const allowedFileTypes = {
    image: {
        mime: /^image\/(jpeg|png|gif|webp)/,
        ext: /\.(jpe?g|png|gif|webp)$/i,
        maxSize: 5 * 1024 * 1024, // 5MB
    },
    video: {
        mime: /^video\/(mp4|quicktime|x-msvideo|x-matroska|webm)/,
        ext: /\.(mp4|mov|avi|mkv|webm)$/i,
        maxSize: 50 * 1024 * 1024, // 50MB
    },
    document: {
        mime: /^application\/(pdf|msword|vnd\.openxmlformats-officedocument|vnd\.ms-excel|vnd\.ms-powerpoint)|text\/plain/,
        ext: /\.(pdf|docx?|xlsx?|pptx?|txt)$/i,
        maxSize: 10 * 1024 * 1024, // 10MB
    },
};

const fileFilter = (req, file, cb) => {
    let isValid = false;
    let error = "File type not allowed!";

    for (const type in allowedFileTypes) {
        const { mime, ext } = allowedFileTypes[type];

        if (
            mime.test(file.mimetype) &&
            ext.test(path.extname(file.originalname))
        ) {
            isValid = true;
            break;
        }
    }

    if (isValid) {
        cb(null, true);
    } else {
        cb(new Error(error));
    }
};

const uploadMultipleFiles = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 10,
    },
}).array("files", 10);

module.exports = uploadMultipleFiles;
