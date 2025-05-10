const { model, Schema, Types } = require('mongoose');

const DOCUMENT_NAME = 'User';
const COLLECTION_NAME = 'users';

const UserSchema = new Schema({
    full_name: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        trim: true,
    },
    avatar_url: {
        type: String,
        trim: true
    },
    date_of_birth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female']
    },
    friends: [
        {
            type: Schema.Types.ObjectId,
            ref: DOCUMENT_NAME,
            default: []
        }
    ],
    sentRequests: [  
        {
            type: Schema.Types.ObjectId, 
            ref: DOCUMENT_NAME ,
            default: []
        }
    ],
    friendRequests: [ 
        {
            type: Schema.Types.ObjectId,
            ref: DOCUMENT_NAME ,
            default: []
        }
    ],
    is_online: {
        type: Boolean,
        default: false
    },
    is_has_password: {
        type: Boolean,
        default: false
    },
    last_seen: {
        type: Date,
        default: Date.now
    },
    token_version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true,
    collection: COLLECTION_NAME
});

module.exports = model(DOCUMENT_NAME, UserSchema);
