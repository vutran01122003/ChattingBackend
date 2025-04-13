const multer = require("multer");
const path = require("path");

const checkTypeFile = (file, cb) => {
    const fileTypes = /jpg|jpeg|gif|png/;
    const extFile = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const typeFile = fileTypes.test(file.mimetype.toLowerCase());

    if (extFile && typeFile) return cb(null, true);

    return cb("Invalid image type");
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        checkTypeFile(file, cb);
    },
    limits: {
        fileSize: 5000000
    }
});

module.exports = upload;
