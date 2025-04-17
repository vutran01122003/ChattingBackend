const { model, Schema } = require("mongoose");
const DOCUMENT_NAME = "Conversation";
const COLLECTION_NAME = "conversations";

const ConversationSchema = new Schema(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        last_message: {
            type: Schema.Types.ObjectId,
            ref: "Message",
        },
        last_message_time: {
            type: Date,
            default: Date.now,
        },
        conversation_type: {
            type: String,
            enum: ["friend", "stranger"],
            default: "stranger",
        },
        read_by: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                },
                read_at: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        is_group: {
            type: Boolean,
            default: false,
        },
        admin: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
        collection: COLLECTION_NAME,
    }
);

ConversationSchema.index({ participants: 1 });

module.exports = model(DOCUMENT_NAME, ConversationSchema);
