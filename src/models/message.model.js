const { model, Schema } = require("mongoose");
const DOCUMENT_NAME = "Message";
const COLLECTION_NAME = "messages";

const MessageSchema = new Schema(
    {
        conversation_id: {
            type: Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            trim: true,
        },
        attachments: [
            {
                file_name: String,
                file_path: String,
                file_type: String,
                file_size: Number,
            },
        ],
        is_revoked: {
            type: Boolean,
            default: false,
        },
        deleted_by: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        forwarded_from: {
            type: Schema.Types.ObjectId,
            ref: "Message",
        },
        reply_from: {
            type: Schema.Types.ObjectId,
            ref: "Message",
        },
        read_by: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        reactions: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                },
                emoji: {
                    type: String,
                    enum: [
                        ":heart",
                        ":like",
                        ":haha",
                        ":wow",
                        ":huhu",
                        ":angry",
                    ],
                },
            },
        ],
    },
    {
        timestamps: true,
        collection: COLLECTION_NAME,
    }
);
MessageSchema.index({ conversation_id: 1, sender: 1 });

module.exports = model(DOCUMENT_NAME, MessageSchema);
