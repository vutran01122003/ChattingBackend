const multer = require("multer");
const path = require("path");

const allowedFileTypes = {
    image: {
        mime: /^image\/(jpeg|png|gif|webp)/,
        ext: /\.(jpe?g|png|gif|webp)$/i,
        maxSize: 5 * 1024 * 1024, // 5MB
        maxCount: 3,
    },
    video: {
        mime: /^video\/(mp4|quicktime|x-msvideo|x-matroska|webm)/,
        ext: /\.(mp4|mov|avi|mkv|webm)$/i,
        maxSize: 50 * 1024 * 1024, // 50MB
        maxCount: 1,
    },
    document: {
        mime: /^application\/(pdf|msword|vnd\.openxmlformats-officedocument|vnd\.ms-excel|vnd\.ms-powerpoint)|text\/plain/,
        ext: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i,
        maxSize: 10 * 1024 * 1024, // 10MB
        maxCount: 1,
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

const storage = multer.memoryStorage();

const uploadMultipleFiles = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 3,
    },
}).array("files", 3);

const conditionalUpload = (req, res, next) => {
    uploadMultipleFiles(req, res, (err) => {
        if (err) return next(err);

        const files = req.files;
        if (!files || files.length === 0) return next();

        let fileTypeGroup = null;

        for (const file of files) {
            for (const type in allowedFileTypes) {
                const { mime, ext } = allowedFileTypes[type];
                if (
                    mime.test(file.mimetype) &&
                    ext.test(path.extname(file.originalname))
                ) {
                    if (!fileTypeGroup) {
                        fileTypeGroup = type;
                    } else if (fileTypeGroup !== type) {
                        return next(
                            new Error(
                                "Only one file type group (image, video, or document) is allowed per request"
                            )
                        );
                    }
                }
            }
        }

        const { maxCount } = allowedFileTypes[fileTypeGroup] || {};
        if (files.length > maxCount) {
            return next(
                new Error(
                    `Too many files. Maximum allowed for ${fileTypeGroup}s is ${maxCount}`
                )
            );
        }

        next();
    });
};

module.exports = conditionalUpload;
